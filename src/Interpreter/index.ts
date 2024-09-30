import * as Protocols from "../Protocols"
import { Interpreter } from "../Protocols/classes"
import * as types from "../types"


export async function interpret(authors:types.userId[], interpreters? : types.InterpreterRequest[] ) : Promise<types.RatingsList>{
  const ratings : types.RatingsList = []
  let request : types.InterpreterRequest
  let protocol : Interpreter

  if(!!authors && !!interpreters){
    // loop through each interpreter request
    for(let r in interpreters){
      request = interpreters[r]
      protocol = Protocols[request.source][request.protocol]
      if(!!protocol){
        // fetch protocol specific dataset
        // TODO incorporate PER protocol authors list
        await protocol.fetchData(authors) 
        
        // interpret dataset and add to ratings
        ratings.push(...protocol.interpret(request.params))       
      }
      // TODO merge/purge duplicate or conflicting ratings ?
    }
  }
  return ratings

}



