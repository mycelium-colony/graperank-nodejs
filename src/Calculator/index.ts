import * as types from "../types"
import { Grapevine } from "./classes"

/**
 * Calculate new scorecard tables 
 */
export function calculate ( ratings : types.Rating[], request : types.EngineRequest, engineparams : types.EngineParams) : types.Scorecard[] {

  let rating : types.Rating
  let ratercards : Record<types.userId,types.Scorecard> = {}
  let calculators : Record<types.elemId,ScorecardCalculator> = {}
  let scorecards : types.Scorecard[] = []

  for(let r in ratings){
    rating = ratings[r]
    // console.log("GrapeRank : Calculate : scorecard for ratee : ", rating.ratee)
    // Step 0 : initialize or Retrieve a ScorecardCalculator for each ratee in ratings
    calculators[rating.ratee] = calculators[rating.ratee] || new ScorecardCalculator({
      observer : request.observer,
      context : request.context,
      subject : rating.ratee
    })

    // Step 1 : retrieve and reference the rater from input scorecards
    ratercards[rating.rater] = ratercards[rating.rater] || getScorecard({
      observer : request.observer,
      context : request.context,
      subject: rating.rater
    }, request.input )

    // step 2 : add rater's rating to the sum of weights & products for the ratee scorecard
    calculators[rating.ratee].sum(
      request.observer,
      rating, 
      engineparams,
      ratercards[rating.rater]
    )

  }
  // step 3 : calculate final influence and conficdence for each ratee scorecard
  for(let r in calculators){
    calculators[r].calculate(engineparams)
    if(calculators[r].scorecard) scorecards.push(calculators[r].scorecard)
  }

  return scorecards
}


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

  constructor(keys : types.ScorecardKeys){
    this.card = {...keys}
  }

  // calculate weight & product 
  sum( observer : types.userId, rating : types.Rating, params : types.EngineParams, rater? : types.Scorecard){
    // determine rater influence
    let influence = rater?.score != undefined ? rater.score : params.score
    let weight = influence * rating.confidence;
    // no attenuation for observer
    if (rating.rater != observer) 
      // TODO get default attenuation from engine ?
      weight = weight * (params.attenuation);
    // add to sums
    this.sums.weights += weight
    this.sums.products += this.sums.weights * rating.score
  }

  calculate(params : types.EngineParams){
    // TODO if weights < 0 = "bots and bad actors" ... 
    // maybe we should store a weighted blacklist of 'rejected'?
    if(!this.card.calculated && this.sums.weights > params.minweight){
      const average = this.sums.products / this.sums.weights
      this.card.confidence = this.calculateConfidence(params.rigor)
      this.card.score = average * this.card.confidence
      this.card.calculated = new Date().valueOf()
    }
    if(this.card.score && this.card.score > 0)
    console.log("GrapeRank : Calculate : score : ", this.card.score)
  }

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


function getScorecard(keys : Partial<types.ScorecardKeys>, scores:types.Scorecard[] = []) : types.Scorecard | undefined{
  for(let s in scores){
    if((keys.observer == scores[s].observer || undefined)
      && keys.subject == scores[s].subject) {
      return  scores[s]
    }
  }
}

function getRating(rater:types.userId, ratings:types.RatingsList = []) : types.Rating | undefined{
  for(let r in ratings){
    if(rater == ratings[r].rater) return ratings[r]
  }
}