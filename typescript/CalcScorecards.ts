
type pubkey = string
type uid = string
type context = string

type G = Record< 
  pubkey, Record< 
    uid, Scorecard >>

class Scorecard {
  constructor(
   public influence : number = 0, // non negative number 
   public average : number = 0, // number
   public input : number = 0, // non negative number 
   public confidence : number = 0, // 0 - 1
   public totals : number = 0, // mutable
   public context? : string // TODO Scorecard might need to be indexed by context
  ){}
}

type R = Record< 
  pubkey, Record< 
    uid, Rating >>

class Rating {
  context : string // TODO Rating might need to be indexed by context
  confidence : number // 0 - 1
  score : number // number
}

class P {
  attenuation : number // 0 -1 
  rigor : number // 0 -1
  default : {
    confidence : number // 0 - 1
    score : number // number
    influence : number // number
  }
}

class calculator {
  observer: pubkey

  calculateGrapeRankScorecards( G : G, R : R, P : P) : G {
    // const g_out = new G()
    let rated : {[x:uid] : Scorecard} = {}
    let raters = {}
    // Step 1 : for each pubkey in R
    for(let pubkey in R){
      raters[pubkey] = G[this.observer][pubkey]?.influence || P.default.influence
      for(let uid in R[pubkey]){
        // step 2 : for each UID in R[pubkey]
        if(!rated[uid]){
          rated[uid] = new Scorecard(0)
        }
        // calculate weight & product
        let weight = raters[pubkey] * R[pubkey][uid].confidence;
        // no attenuationFactor for observer
        if (pubkey != this.observer) 
          weight = weight * P.attenuation;
        // add to sum
        rated[uid].input += weight
        rated[uid].totals += weight * R[pubkey][uid].score
      }
    }
    for(let uid in rated){
      if(rated[uid].input > 0){
        rated[uid].average = rated[uid].totals / rated[uid].input
        rated[uid].confidence = this.convertInputToCertainty(rated[uid].input, P.rigor)
        rated[uid].influence = rated[uid].average * rated[uid].confidence
      }
    }
    return {observer:rated}
  }

  convertInputToCertainty(input, rigor){
    const rigority = -Math.log(rigor)
    const fooB = -input * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }
  
}


