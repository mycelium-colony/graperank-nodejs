import * as types from "./types"


export class GrapeRank {
  
  /**
   * get scorecard tables from cache (or call calculate) 
   */
  get() : types.G {
    throw('not implemented')
  }
  
  /**
   * Calculate new scorecard tables (and store in cache)
   */
  calculate() : types.G {
    throw('not implemented')
  }
  
}

class Scorecard implements types.Scorecard {
  readonly GID : types.GID
  readonly UID : types.elemId
  // public sig : signature
  constructor(
   public influence : number = 0, // non negative number 
   public average : number = 0, // number
   public weights : number = 0, // non negative number 
   public confidence : number = 0, // 0 - 1
   public totals : number = 0, // mutable
   public context? : types.context // TODO  // must be unique for each observer
  ){}
}

function calculateScorecards( G : types.G, R : types.R, P : types.P) : types.G {
    // const g_out = new G()
    let rated : {[x:types.elemId] : Scorecard} = {}
    let raters = {}
    // Step 1 : for each pubkey in R
    for(let pubkey in R){
      raters[pubkey] = G[P.observer][pubkey]?.influence || P.default.influence
      for(let elemId in R[pubkey]){
        // step 2 : for each UID in R[pubkey]
        if(!rated[elemId]){
          rated[elemId] = new Scorecard()
        }
        // calculate weight & product
        let weight = raters[pubkey] * ( R[pubkey][elemId]?.confidence || 0 );
        // no attenuationFactor for observer
        if (pubkey != P.observer) 
          weight = weight * P.attenuation;
        // add to sum
        rated[elemId].weights += weight
        rated[elemId].totals += weight * ( R[pubkey][elemId]?.score || 0 )
      }
    }
    for(let elemId in rated){
      if(rated[elemId].weights > 0){
        rated[elemId].average = rated[elemId].totals / rated[elemId].weights
        rated[elemId].confidence = convertWeightsToCertainty(rated[elemId].weights, P.rigor)
        rated[elemId].influence = rated[elemId].average * rated[elemId].confidence
      }
    }
    return {observer:rated}
  }

function convertWeightsToCertainty(weights : number, rigor : number){
    const rigority = -Math.log(rigor)
    const fooB = -weights * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }
  

