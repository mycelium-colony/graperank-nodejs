import * as Protocols from "../Protocols"
import { InterpretationProtocol } from "../Protocols/classes"
import * as types from "../types"
import { mergeBigArrays } from "../utils"


export async function interpret(raters:types.userId[], requests? : types.InterpreterRequest[] ) : Promise<types.RatingsList>{
  let ratings : types.RatingsList = []
  let request : types.InterpreterRequest
  let thisiteration = 0, maxiterations = 1
  // holds all raters pased between protocol requests
  const allraters : Set<types.userId> = new Set()
  // holds new raters added between protocol iterations
  let newraters : Set<types.userId> | undefined

  if(!!raters && !!requests){
    console.log("GrapeRank : interpret : requesting ",requests.length, " protocols for ",raters.length," raters")

    // add input raters to allraters
    for(let r in raters){  allraters.add(raters[r]) }

    // loop through each interpreter request
    for(let r in requests){
      request = requests[r]
      maxiterations = request.params?.iterate || maxiterations

      console.log("GrapeRank : interpret : calling " +request.protocol+" protocol with ", maxiterations," iterations")

      while(thisiteration < maxiterations){
        // increment for each protocol iteration
        thisiteration ++
        console.log("GrapeRank : interpret : protocol : itaration ", thisiteration, " of ", maxiterations, " with ", newraters?.size || allraters.size," new raters")

        try{
          // TODO incorporate PER protocol raters list
          // fetch protocol specific dataset for newraters OR allraters
          await protocolFetchData(request.protocol, newraters || allraters)
          // interpret dataset and add to ratings
          // handle big arrays with care
          ratings = await mergeBigArrays( ratings,
            await protocolInterpret(request.protocol, request.params)
          )
          console.log("GrapeRank : interpret : protocol : added " ,ratings.length, " ratings")
        }catch(e){
          console.log('GrapeRank : interpret : ERROR : ',e)
        }

        // get new raters from ratings for next iteration
        if(thisiteration < maxiterations) {
          newraters = getNewRaters(ratings, allraters)
          console.log("GrapeRank : interpret : protocol : added " ,newraters.size, " new raters from ratings for next iteration")
          // merge all raters to include new raters
          newraters.forEach((rater) => allraters.add(rater))
        }
        // unset new raters if protocol iterations are complete
        else {  newraters = new Set()  }
        
      }



      // TODO merge/purge duplicate or conflicting ratings ?
    }
  }
  return ratings

}

async function protocolFetchData(protocol:types.protocol, raters: Set<types.userId>){
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)
  return await instance.fetchData(raters)
}

async function protocolInterpret(protocol:types.protocol, params? : types.ProtocolParams ): Promise<types.RatingsList>{
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)

  let ratings = await instance.interpret(params)
  for(let r in ratings){
    ratings[r].protocol = protocol
  }
  return ratings
}

function parseProtocolSlug(protocol : types.protocol) : [string, string]{
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

function getNewRaters(ratings : types.Rating[], raters? : Set<types.userId>) : Set<types.userId>{
  let newraters : Set<types.userId> = new Set()
  for(let r in ratings){
    if(!raters || !raters.has(ratings[r].ratee)) 
      newraters.add(ratings[r].ratee)
  }
  return newraters
}

