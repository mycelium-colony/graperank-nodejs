import * as Protocols from "../Protocols"
import { Interpreter } from "../Protocols/classes"
import * as types from "../types"
import { mergeBigArrays } from "../utils"


export async function interpret(authors:types.userId[], requests? : types.InterpreterRequest[] ) : Promise<types.RatingsList>{
  let ratings : types.RatingsList = []
  let request : types.InterpreterRequest
  let protocol : Interpreter

  if(!!authors && !!requests){
    console.log("GrapeRank : interpret : requesting " +requests.length+ " protocols")
    // loop through each interpreter request
    for(let r in requests){
      request = requests[r]
      protocol = Protocols[request.source][request.protocol]
      console.log("GrapeRank : interpret : calling " +request.source+"-"+request.protocol+ " protocol")
      if(!!protocol){
        // fetch protocol specific dataset
        // TODO incorporate PER protocol authors list
        await protocol.fetchData(authors) 
        // interpret dataset and add to ratings
        // handle big arrays with care
        ratings = await mergeBigArrays(ratings, await protocol.interpret(request.params))
        console.log("GrapeRank : interpret : added " +ratings.length+ " ratings")

      }
      // TODO merge/purge duplicate or conflicting ratings ?
    }
  }
  return ratings

}



