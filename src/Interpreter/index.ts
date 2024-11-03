import * as Protocols from "./protocols"
import { InterpretationProtocol } from "./classes"
import { mergeBigArrays } from "../utils"
import { InterpreterRequest, ProtocolParams, RatingsList, userId , protocol, Rating} from "../types"


export async function interpret(raters:userId[], requests? : InterpreterRequest[] ) : Promise<RatingsList>{
  let ratings : RatingsList = []
  let request : InterpreterRequest
  let thisiteration : number, maxiterations : number
  let newratings : RatingsList
  let thisiterationraters : Set<userId>
  // holds all raters pased between protocol requests
  const allraters : Set<userId> = new Set()
  // holds new raters added between protocol iterations
  let newraters : Set<userId> = new Set()
  let requestauthors : Set<userId> | undefined

  if(!!raters && !!requests){
    console.log("GrapeRank : interpret : requesting ",requests.length, " protocols for ",raters.length," raters")

    // add input raters to allraters
    raters.forEach((userid) => allraters.add(userid))

    // loop through each interpreter request
    // requests having `iterations` will ADD to `allraters` with each interation
    // each request will use the `allraters` list from previous requests
    for(let r in requests){
      request = requests[r]
      // reset new raters and new ratings between protocol requests
      newraters = new Set() 
      newratings = [] 
      thisiteration = 0
      maxiterations = request.params?.iterate || 1
      if(request.authors && request.authors.length) requestauthors = new Set(request.authors)

      // console.log("GrapeRank : interpret : calling " +request.protocol+" protocol with ", maxiterations," iterations")

      while(thisiteration < maxiterations){

        // increment for each protocol iteration
        thisiteration ++
        thisiterationraters = requestauthors || newraters.size ?  newraters : allraters
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : iteration begin ", thisiteration, " of ", maxiterations)
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : fetching ratings from ", thisiterationraters.size," raters")

        try{
          // fetch protocol specific dataset for requestauthors OR newraters OR allraters
          await protocolFetchData(request.protocol, thisiterationraters)
          // interpret dataset and add to ratings
          let newratings = await protocolInterpret(request.protocol, request.params)
          // handle big arrays with care
          ratings = await mergeBigArrays( ratings,newratings)
          console.log("GrapeRank : interpret : "+request.protocol+" protocol : retrieved " ,ratings.length, " records")
        }catch(e){
          console.log('GrapeRank : interpret : ERROR : ',e)
        }

        // get new raters from ratings for next iteration
        if(thisiteration < maxiterations) {
          newraters = getNewRaters(ratings, allraters)
          // merge all raters to include new raters
          newraters.forEach((rater) => allraters.add(rater))
        }

        console.log("GrapeRank : interpret : "+request.protocol+" protocol : iteration end : added ",newratings.length, " ratings and " ,newraters.size, " new raters ")
        
      }



      // TODO merge/purge duplicate or conflicting ratings ?
    }
  }
  return ratings

}

async function protocolFetchData(protocol:protocol, raters: Set<userId>){
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)
  return await instance.fetchData(raters)
}

async function protocolInterpret(protocol:protocol, params? : ProtocolParams ): Promise<RatingsList>{
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)

  let ratings = await instance.interpret(params)
  for(let r in ratings){
    ratings[r].protocol = protocol
  }
  return ratings
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

function getNewRaters(ratings : Rating[], raters? : Set<userId>) : Set<userId>{
  let newraters : Set<userId> = new Set()
  for(let r in ratings){
    if(!raters || !raters.has(ratings[r].ratee)) 
      newraters.add(ratings[r].ratee)
  }
  return newraters
}

