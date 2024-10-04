import { GrapeRank } from ".."
import * as types from "../types"
import { Grapevine } from "./classes"

const sampleid = "df67f9a7e41125745cbe7acfbdcd03691780c643df7bad70f5d2108f2d4fc200"
/**
 * Calculate new scorecards from interpreted ratings and input scorecards
 */
export function calculate ( ratings : types.Rating[], engine : GrapeRank) : types.Scorecard[] {

  let rating : types.Rating
  let rater : types.userId
  let ratee : types.elemId
  let ratercards : Map<types.userId,types.Scorecard> = new Map()
  let calculators : Map<types.elemId,ScorecardCalculator> = new Map()
  let scorecards : Map<types.elemId,types.Scorecard> = new Map()
  let iteration = 0, maxiterations = 8

  while(iteration < maxiterations){
    iteration ++

    for(let r in ratings){
      rating = ratings[r]
      rater = rating.rater
      ratee = rating.ratee

      // console.log("GrapeRank : Calculate : scorecard for ratee : ", rating.ratee)
      // STEP A : get rater influence
      // retrieve and reference the rater from input scorecards
      ratercards[rater] = ratercards[rater] || getScorecard({
        observer : engine.observer,
        context : engine.context,
        subject: rater
      }, engine )

      // STEP B : initialize ratee scorecard
      // Retrieve or create a ScorecardCalculator for each ratee in ratings
      calculators[ratee] = calculators[ratee] || new ScorecardCalculator({
        observer : engine.observer,
        context : engine.context,
        subject : ratee
      }, engine.params )

      // STEP C : calculate sums
      // Add rater's rating to the sum of weights & products for the ratee scorecard
      calculators[ratee].sum(
        engine.observer,
        rating, 
        ratercards[rater]
      )
    }

    // for(let rater in ratercards){
    //   console.log("GrapeRank : Calculator : for rater score", ratercards[rater].score)
    // } 

    // STEP D : calculate influence
    // calculate final influence and conficdence for each ratee scorecard
    for(let r in calculators){
      calculators[r].calculate()
      if(calculators[r].scorecard?.subject && calculators[r].scorecard?.score) 
        // if(calculators[r].scorecard.score > 0) 
          scorecards.set(calculators[r].scorecard.subject as string, calculators[r].scorecard)
    }

    // LOG iteration
    logIteration(scorecards, iteration)

    // STEP F : update rater scores
    for(let rater in ratercards){
      if(calculators[rater]?.scorecard && ratercards[rater].score != calculators[rater].scorecard.score){
        console.log("GrapeRank : Calculator : updating rater card", ratercards[rater].score , " -> " , calculators[rater].scorecard.score)
        ratercards[rater].score = calculators[rater].scorecard.score
      }
    }

  }
  return [...scorecards.values()]
}

// export function iterate(scorecards : types.Scorecard[], request : types.EngineRequest, engineparams : types.EngineParams) : types.Scorecard[] {


// }

class ScorecardCalculator {

  get scorecard(){
    if(this.card.calculated)
      return this.card
  }

  private card : types.Scorecard = {}

  private sums : types.CalculatorSums = {
    weights : 0,
    products : 0
  }

  private params : types.EngineParams

  constructor(keys : types.ScorecardKeys, params : types.EngineParams){
    this.card = {...keys}
    this.params = params
  }

  // STEP C : calculate sums
  // calculate sum of weights & sum of products
  sum( observer : types.userId, rating : types.Rating, ratercard? : types.Scorecard){
    // determine rater influence
    let influence = ratercard?.score !== undefined ? ratercard.score : 
    ratercard?.subject == observer ? 1 : 0
    let weight = influence * rating.confidence; 
    // no attenuation for observer
    if (rating.rater != observer) 
      weight = weight * (this.params.attenuation);
    // add to sums
    this.sums.weights += weight
    this.sums.products += weight * rating.score
    // if(rater?.subject == sampleid){
    //   console.log("GrapeRank : Calculate : sample card subject : ",this.card.subject)
    //   console.log("GrapeRank : Calculate : sample card sums : ",this.sums)
    // }
  }

  // STEP D : calculate influence
  calculate(){
    // TODO if weights < 0 = "bots and bad actors" ... 
    // maybe we should store a weighted blacklist of 'rejected'?
    if(!this.card.calculated){
      if(this.sums.weights > this.params.minweight){
        const average = this.sums.products / this.sums.weights
        // STEP E : calculate confidence
        this.card.confidence = this.calculateConfidence(this.params.rigor)
        this.card.score = average * this.card.confidence
        this.card.calculated = new Date().valueOf()
        // console.log("GrapeRank : Calculate : card calculated : ", this.card)
      }else{
        // console.log("GrapeRank : Calculate : weight is bellow min for ", this.card)
      }
    }
    // if(this.card.score && this.card.score > 0)
    // console.log("GrapeRank : Calculate : score : ", this.card.score)
  }

  // STEP E : calculate confidence
  private calculateConfidence(rigor? : number){
    // TODO get default rigor
    rigor = rigor !== undefined ? rigor : 1
    const rigority = -Math.log(rigor)
    const fooB = -this.sums.weights * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }
}




// STEP A : get rater influence
function getScorecard(keys : Partial<types.ScorecardKeys>, request:types.EngineRequest) : types.Scorecard | undefined{

  let scorecard : types.Scorecard | undefined = undefined

  for(let s in request.input){
    if((keys.observer == request.input[s].observer || undefined)
      && keys.subject == request.input[s].subject) {
      scorecard =  request.input[s]
    }
  }
  return scorecard
}

function getRating(rater:types.userId, ratings:types.RatingsList = []) : types.Rating | undefined{
  for(let r in ratings){
    if(rater == ratings[r].rater) return ratings[r]
  }
}

function countScorecardsByScore(scorecards : types.Scorecard[], increment : number = 10 ) : number[] {
  let grouped = groupScorecardsByScore(scorecards,increment)
  let count : number[] = []
  let index = 0
  for(let g in grouped){
    count[index] = grouped[g].length
    index ++
  }
  return count
}

function groupScorecardsByScore(scorecards : types.Scorecard[], increment : number = 10 ) : types.Scorecard[][] {
  let group : types.Scorecard[][] = []
  for(let s in scorecards){
    let card = scorecards[s]
    if(card?.score){
      let groupid = Math.floor(card.score / increment)
      if(!group[groupid]) group[groupid] = []
      group[groupid].push(card)
    }
  }
  return group
}


// LOG iteration
function logIteration(scorecards : Map<types.elemId,types.Scorecard> , iteration : number){
    console.log("--------------------------------")
    console.log("GrapeRank : Calculator : iteration " + iteration)
    let increment = .1
    let count = countScorecardsByScore([...scorecards.values()], increment)
    let v = "", ov = ""
    for(let i in count){
      ov = v || "0"
      v = ((i as unknown as number) * increment).toPrecision(1)
      console.log("number of cards having scores from "+ ov +" to " +v+ " = ", count[i])
    }
    console.log("TOTAL number scorecards = ",scorecards.size)  
}