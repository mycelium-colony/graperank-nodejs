import { ParamsObject, R, RatingCacheParams, ScorecardCacheParams } from "../types"

/**
 * Storage and retrieval of 
 * - cached Grapevine Scorecards with ScorecardCacheParams
 * - cached Ratings Interpretations with RatingCacheParams
 */

type StorageAPI = {
  get(params:ParamsObject) : Promise<object> 
  put(params:ParamsObject, data: object) : Promise<ParamsObject> 
}

const endpoint = "https://cache.grapevine.my";


export const RatingsCache : StorageAPI = {

  get : async (params: Partial<RatingCacheParams>) : Promise<R>=> {
    const request = new Request(endpoint,{
      method: "GET",
      body: JSON.stringify(params),
      headers: { "Content-Type": "application/json" },
    })
    return apiFetch(request)
  },

  put : async (params:RatingCacheParams, R: R) : Promise<ParamsObject> => {
    const request = new Request(endpoint,{
      method: "PUT",
      body: JSON.stringify({params,R}),
      headers: { "Content-Type": "application/json" },
    })
    return apiFetch(request)
  }

}

export const ScorecardCache : StorageAPI = {
  get : async (params: Partial<ScorecardCacheParams>) : Promise<R> => {
   return {}
  },
  put : async (params: ScorecardCacheParams, R: R) :Promise<ParamsObject> => {
   return {}
  }
 }
 

 async function apiFetch(request : Request){
  return await fetch(request)
  .then(async (response)=>{
    return JSON.parse( await response.json() )
  }).catch((reason)=>{
    throw(new Error(reason))
  })
 }