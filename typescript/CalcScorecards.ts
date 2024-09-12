
type pubkey = string
type uid = string
type context = string

/**
 * A Scorecards Table 
 * Input and output from GrapeRank calculations
 */
type G = Record< 
  pubkey, Record< 
    uid, Scorecard >>

class Scorecard {
  constructor(
   public influence : number = 0, // non negative number 
   public average : number = 0, // number
   public weights : number = 0, // non negative number 
   public confidence : number = 0, // 0 - 1
   public totals : number = 0, // mutable
   public context? : string // TODO Scorecard might need to be indexed by context
  ){}
}

/**
 * A Ratings Table
 * Input for GrapeRank calculations
 */
type R = Record< 
  pubkey, Record< 
    uid, Rating >>

class Rating {
  confidence : number // 0 - 1
  score : number // number
  context? : string // TODO Rating might need to be indexed by context
}

/**
 * Observer Parameters for GrapeRank
 */
class P {
  observer: pubkey
  attenuation : number // 0 -1 
  rigor : number // 0 -1
  default : {
    confidence : number // 0 - 1
    score : number // number
    influence : number // number
  }
}


function calculateGrapevineTable( G : G, R : R, P : P) : G {
    // const g_out = new G()
    let rated : {[x:uid] : Scorecard} = {}
    let raters = {}
    // Step 1 : for each pubkey in R
    for(let pubkey in R){
      raters[pubkey] = G[P.observer][pubkey]?.influence || P.default.influence
      for(let uid in R[pubkey]){
        // step 2 : for each UID in R[pubkey]
        if(!rated[uid]){
          rated[uid] = new Scorecard()
        }
        // calculate weight & product
        let weight = raters[pubkey] * R[pubkey][uid].confidence;
        // no attenuationFactor for observer
        if (pubkey != P.observer) 
          weight = weight * P.attenuation;
        // add to sum
        rated[uid].weights += weight
        rated[uid].totals += weight * R[pubkey][uid].score
      }
    }
    for(let uid in rated){
      if(rated[uid].weights > 0){
        rated[uid].average = rated[uid].totals / rated[uid].weights
        rated[uid].confidence = convertWeightsToCertainty(rated[uid].weights, P.rigor)
        rated[uid].influence = rated[uid].average * rated[uid].confidence
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
  


