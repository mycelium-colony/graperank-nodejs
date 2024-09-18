import * as Interpretors from "./Interpretors"
import * as types from "../types"
import { RatingsCache } from "../Storage/api";

export class InterpretationAPI{

  // methods(){
  //   return {
  //     interpret : {
  //       params : {
  //         raters : 'userId[] : an array of user identifiers (nostr pubkeys) for which to fetch and interpret data.',
  //         interpretor : 'string : class name of InterpretorSource implementor',
  //         interpretations : 'InterpretationParams[] : any number of interpretations for fetched data may be processed in a given request.',
  //       },
  //       returns : "RatingsTable",
  //       description : 'This API collects and interprets users ratings from various data sources'
  //     }
  //   }
  // }

  async interpret(params : types.InterpretorParams ) : Promise<types.R>{
    let R_out : types.R = {}
    let interpretor : Interpretors.InterpretorSource | undefined;
    let interpretableData : types.InterpretableData | undefined;
    try{
      // instantiate a new InterptretorClass
      interpretor = new Interpretors[params.interpretor](params)
      // fetch data from interprtretorClass
      interpretableData = await interpretor?.fetchData()
    }catch{
      throw(new Error("Ratables Class not found"))
    }
    if(!!interpretor && !!interpretableData){
      // loop through each kind of data to be interpreted
      for(let kind in interpretableData){
        let interpretationParamsKind = getInterpretationParamsKind(params.interpretations, kind as unknown as number)
        // loop through each author of data to be interpreted
        for(let author in interpretableData[kind]){
          // loop thorugh each interpretation requested of kind
          for(let r in interpretationParamsKind){
            // identify the interpret ratings callback on InterpretorSource
            let interpretRatingsCallback = interpretor.interpretRatings[kind]
            let newratings : types.R
            if(typeof interpretRatingsCallback == "function"){
              let prefs = interpretationParamsKind[r].prefs
              // call the interpret ratings callback on InterpretorSource
              newratings = interpretRatingsCallback( interpretableData[kind][author], author, prefs)
              RatingsCache.put({ source : interpretor.source, kind : kind }, newratings)
              R_out = mergeRs([ R_out,newratings])}
          }
        }
      }
    }
    return R_out
  }

  
}




function mergeRs(Rs : types.R[]){
  const R : types.R = {};
  for(let r in Rs){
    for(let rater in Rs[r]){
      for(let ratee in Rs[r][rater]){
        // TODO how to process multiple ratings by one rator of the same ratee 
        // for example : a mute AND a report OR a follow AND a report OR a follow AND a mute?
        R[rater][ratee] = Rs[r][rater][ratee]
      }
    }
  }
  return R;
}

function getInterpretationParamsKind(params : types.InterpretationParams[], kind:types.kindId) : types.InterpretationParams[] {
  let kindparams : types.InterpretationParams[] = []
  for(let p in params){
    if(params[p].kind == kind as unknown as string) 
      kindparams.push(params[p])
  }
  return kindparams;
}


