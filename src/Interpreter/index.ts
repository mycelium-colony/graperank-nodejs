import * as Protocols from "../Protocols"
import { InterpretationProtocol } from "../Protocols/classes"
import * as types from "../types"
import { mergeBigArrays } from "../utils"


export async function interpret(authors:types.userId[], requests? : types.InterpreterRequest[] ) : Promise<types.RatingsList>{
  let ratings : types.RatingsList = []
  let request : types.InterpreterRequest

  if(!!authors && !!requests){
    console.log("GrapeRank : interpret : requesting " +requests.length+ " protocols")
    // loop through each interpreter request
    for(let r in requests){
      request = requests[r]
      console.log("GrapeRank : interpret : calling " +request.protocol+" protocol")
      try{
        // fetch protocol specific dataset
        // TODO incorporate PER protocol authors list
        await protocolFetch(request.protocol, authors)
        // interpret dataset and add to ratings
        // handle big arrays with care
        ratings = await mergeBigArrays( ratings,
          await protocolInterpret(request.protocol, request.params)
        )
        console.log("GrapeRank : interpret : added " +ratings.length+ " ratings")
      }catch(e){
        console.log('GrapeRank : interpret : ERROR : ',e)
      }
      // TODO merge/purge duplicate or conflicting ratings ?
    }
  }
  return ratings

}

async function protocolFetch(protocol:types.slug, authors: types.userId[]){
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)
  return await instance.fetchData(authors)
}

async function protocolInterpret(protocol:types.slug, params? : types.ProtocolParams ): Promise<types.RatingsList>{
  let [source,datatype] = parseProtocolSlug(protocol)
  let instance = getProtocolInstance(source, datatype)

  let ratings = await instance.interpret(params)
  for(let r in ratings){
    ratings[r].protocol = protocol
  }
  return ratings
}

function parseProtocolSlug(protocol : types.slug) : [types.slug, types.slug]{
  let tuple = protocol.split("-",2)
  if(!tuple[1]) tuple[1] = ""
  return tuple as [types.slug, types.slug]
}

function getProtocolInstance(source:types.slug, datatype:types.slug,) : InterpretationProtocol {
  let instance = Protocols[source][datatype]
  if(!instance.fetchData || !instance.interpret){
    throw('no protocol instance found for ' + source +"-"+ datatype)
  }
  return instance
}
