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
    console.log("GrapeRank : interpret : requesting ",requests.length, " protocols for ",raters.length," raters")

    // add input raters to allraters
    raters.forEach((userid) => allraters.set(userid,0))

    // loop through each interpreter request
    // requests having `iterations` will ADD to `allraters` with each interation
    // each request will use the `allraters` list from previous requests
    for(let r in requests){
      request = requests[r]
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
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : iteration begin ", thisiteration, " of ", maxiterations)
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : fetching ratings from ", thisiterationraters.size," raters")


        try{
          // fetch protocol specific dataset for requestauthors OR newraters OR allraters
          await protocolFetchData(request.protocol, thisiterationraters)
          // interpret dataset and add to ratings
          newratings = await protocolInterpret(request.protocol, thisiteration, request.params)

          // get new raters from ratings for next iteration
          if(thisiteration < maxiterations) {
            newraters = getNewRaters(ratings, allraters)
            // merge all raters to include new raters
            newraters.forEach((rater) => allraters.set(rater, thisiteration))
            // add iteration number (as dos) to rating
          }

          // handle big arrays with care
          ratings = await mergeBigArrays(newratings,ratings)
          console.log("GrapeRank : interpret : "+request.protocol+" protocol : retrieved " ,ratings.length, " records")
        }catch(e){
          console.log('GrapeRank : interpret : ERROR : ',e)
        }

        responses.push({
          protocol : request.protocol,
          iteration : thisiteration,
          numraters : thisiterationraters.size,
          // TODO get numfetched from protocol
          numfetched : undefined,
          numratings : newratings.length
        })

        console.log("GrapeRank : interpret : "+request.protocol+" protocol : iteration end : added ",newratings.length, " ratings and " ,newraters.size, " new raters ")
        
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

async function protocolInterpret(protocol:protocol, iteration: number, params? : ProtocolParams ): Promise<RatingsList>{
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)
  let numzero = 0
  let ratings = await instance.interpret(params)
  for(let r in ratings){
    ratings[r].protocol = protocol
    ratings[r].iteration = iteration
    if(ratings[r].score == 0) numzero ++
  }

  console.log("GrapeRank : interpret : "+protocol+" protocol : iteration "+iteration+" : number of zero scored ratings = "+numzero+" of "+ratings.length+" ratings")
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
function getNewRaters(ratings : Rating[], allraters? : Map<userId, number>) : Set<userId>{
  let newraters : Set<userId> = new Set()
  for(let r in ratings){
    if(!allraters || !allraters.has(ratings[r].ratee)) 
      newraters.add(ratings[r].ratee)
  }
  return newraters
}

