import * as Interpretors from "./Interpretors"
import * as types from "../types"

export class InterpretationAPI {

  async interpret(params : types.InterpretorParams ) : Promise<types.R>{
    let R_out : types.R = {}
    let interpretor : Interpretors.InterpretorClass | undefined;
    let interpretableData : types.InterpretableData | undefined;
    try{
      interpretor = new Interpretors[params.interpretor](params)
      interpretableData = await interpretor?.fetchData()
    }catch{
      throw(new Error("Ratables Class not found"))
    }
    if(!!interpretor && !!interpretableData){
      for(let kind in interpretableData){
        let interpretationParamsKind = getInterpretationParamsKind(params.interpretations, kind as unknown as number)
        for(let author in interpretableData[kind]){
          for(let r in interpretationParamsKind){
            // let interpretKindCallback :  = this[ratableInstance.interpretKindCallbackPrefix+kind]
            let interpretRatingsCallback = interpretor.interpretRatings[kind]
            if(typeof interpretRatingsCallback == "function"){
              R_out = mergeRs([ R_out,
                interpretRatingsCallback( interpretableData[kind][author], author, interpretationParamsKind[r].prefs)
              ])}
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


