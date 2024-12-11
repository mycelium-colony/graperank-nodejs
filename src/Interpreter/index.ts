import * as Protocols from "./protocols"
import { InterpretationProtocol } from "./classes"
import { mergeBigArrays } from "../utils"
import { ProtocolRequest, ProtocolParams, RatingsList, userId , protocol, Rating, InterpreterResults, ProtocolResponse} from "../types"


export async function interpret(raters:userId[], requests? : ProtocolRequest[] ) : Promise<InterpreterResults>{
  let ratings: RatingsList = []
  let responses : ProtocolResponse[] = []
  let request : ProtocolRequest
  let thisiteration : number, maxiterations : number
  let newratings : RatingsList
  let thisiterationraters : Set<userId>
  // `allraters` map keys hold all raters added as input and between protocol requests
  // map value is the iteration number at which the rater was added
  // (this number ends up in the scorecard as `dos` from observer) 
  const allraters : Map<userId,number> = new Map()
  // holds new raters added between protocol iterations
  let newraters : Set<userId> = new Set()
  let requestauthors : Set<userId> | undefined

  if(!!raters && !!requests){
    console.log("GrapeRank : interpret : instantiating ",requests.length, " protocols for ",raters.length," raters")
    console.log("----------------------------------")
    // add input raters to allraters
    raters.forEach((userid) => allraters.set(userid,0))

    // loop through each interpreter request
    // requests having `iterations` will ADD to `allraters` with each interation
    // each request will use the `allraters` list from previous requests
    for(let r in requests){
      let requestindex = r as unknown as number
      request = requests[requestindex]
      // reset new raters and new ratings between protocol requests
      newraters = new Set() 
      newratings = [] 
      thisiteration = 0
      maxiterations = request.iterate || 1
      if(request.authors && request.authors.length) requestauthors = new Set(request.authors)

      // console.log("GrapeRank : interpret : calling " +request.protocol+" protocol with ", maxiterations," iterations")

      while(thisiteration < maxiterations){

        // increment for each protocol iteration
        thisiteration ++
        thisiterationraters = requestauthors || newraters.size ?  newraters : new Set(allraters.keys())
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : begin iteration ", thisiteration, " of ", maxiterations)
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : fetching ratings from ", thisiterationraters.size," raters")


        try{
          // fetch protocol specific dataset for requestauthors OR newraters OR allraters
          await protocolFetchData(request.protocol, thisiterationraters)
          // interpret dataset and add to ratings
          newratings = await protocolInterpret(request.protocol, requestindex, thisiteration, request.params)
          console.log("GrapeRank : interpret : "+request.protocol+" protocol : added " ,newratings.length, " new ratings, for a total of ",ratings.length)

          // get new raters ONLY IF not on final iteration
          if(thisiteration < maxiterations) {
            newraters = getNewRaters(newratings, allraters)
            // merge all raters to include new raters
            newraters.forEach((rater) => allraters.set(rater, thisiteration))
            console.log("GrapeRank : interpret : "+request.protocol+" protocol : added " ,newraters.size, " new raters, for a total of ", allraters.size)
          }
          // merge newratings with ratings
          // handle big arrays with care
          ratings = await mergeBigArrays(newratings,ratings)
        }catch(e){
          console.log('GrapeRank : interpret : ERROR : ',e)
        }

        responses.push({
          protocol : request.protocol,
          index : requestindex,
          iteration : thisiteration,
          numraters : thisiterationraters.size,
          // TODO get numfetched from protocol
          numfetched : undefined,
          numratings : newratings.length
        })

        console.log("GrapeRank : interpret : "+request.protocol+" protocol : end iteration ", thisiteration, " of ", maxiterations)
        console.log("----------------------------------")
      }

      // TODO merge/purge duplicate or conflicting ratings ?
    }
  }
  return {ratings, responses}

}

async function protocolFetchData(protocol:protocol, raters: Set<userId>){
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)
  return await instance.fetchData(raters)
}

async function protocolInterpret(protocol:protocol, index : number, iteration: number, params? : ProtocolParams ): Promise<RatingsList>{
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)
  let numzero = 0
  let ratings = await instance.interpret(params)
  for(let r in ratings){
    ratings[r].protocol = protocol
    ratings[r].index = index
    ratings[r].iteration = iteration
    if(ratings[r].score == 0) numzero ++
  }

  console.log("GrapeRank : interpret : "+protocol+" protocol : number of zero scored ratings = "+numzero+" of "+ratings.length+" ratings")
  return ratings as RatingsList
}

function parseProtocolSlug(protocol : protocol) : [string, string]{
  let tuple = protocol.split("-",2)
  if(!tuple[1]) tuple[1] = ""
  return tuple as [string, string]
}

function getProtocolInstance(source:string, datatype:string,) : InterpretationProtocol {
  let instance = Protocols[source][datatype]
  if(!instance.fetchData || !instance.interpret){
    throw('no protocol instance found for ' + source +"-"+ datatype)
  }
  return instance
}

// FIXME this ONLY works when USERS are being rated, not CONTENT
// TODO extraction of new authors from rated content 
// will need to be handled by each protocol ...  
function getNewRaters(newratings : Rating[], allraters? : Map<userId, number>) : Set<userId>{
  let newraters : Set<userId> = new Set()
  for(let r in newratings){
    if(!allraters || !allraters.has(newratings[r].ratee)) 
      newraters.add(newratings[r].ratee)
  }
  return newraters
}

