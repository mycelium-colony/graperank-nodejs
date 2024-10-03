import * as types from "../types"
import { Grapevine } from "./classes"

const sampleid = "df67f9a7e41125745cbe7acfbdcd03691780c643df7bad70f5d2108f2d4fc200"
/**
 * Calculate new scorecard tables 
 */
export function calculate ( ratings : types.Rating[], request : types.EngineRequest, engineparams : types.EngineParams) : types.Scorecard[] {

  let rating : types.Rating
  let rater : types.userId
  let ratee : types.elemId
  let ratercards : Record<types.userId,types.Scorecard> = {}
  let calculators : Record<types.elemId,ScorecardCalculator> = {}
  let scorecards : types.Scorecard[] = []

  for(let r in ratings){
    rating = ratings[r]
    rater = rating.rater
    ratee = rating.ratee
    // console.log("GrapeRank : Calculate : scorecard for ratee : ", rating.ratee)
    // STEP A : get rater influence
    // retrieve and reference the rater from input scorecards
    ratercards[rater] = ratercards[rater] || getScorecard({
      observer : request.observer,
      context : request.context,
      subject: rater
    }, request )

    // STEP B : initialize ratee scorecard
    // Retrieve or create a ScorecardCalculator for each ratee in ratings
    calculators[ratee] = calculators[ratee] || new ScorecardCalculator({
      observer : request.observer,
      context : request.context,
      subject : ratee
    })

    // STEP C : calculate sums
    // Add rater's rating to the sum of weights & products for the ratee scorecard
    calculators[ratee].sum(
      request.observer,
      rating, 
      engineparams,
      ratercards[rater]
    )
  }
  // STEP D : calculate influence
  // calculate final influence and conficdence for each ratee scorecard
  for(let r in calculators){
    calculators[r].calculate(engineparams)
    if(calculators[r].scorecard?.score) 
      // if(calculators[r].scorecard.score > 0) 
        scorecards.push(calculators[r].scorecard)
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

  // STEP C : calculate sums
  // calculate sum of weights & sum of products
  sum( observer : types.userId, rating : types.Rating, params : types.EngineParams, rater? : types.Scorecard){
    // determine rater influence
    let influence = rater?.score !== undefined ? rater.score : 
      rater?.subject == observer ? 1 : 0
    let weight = influence * rating.confidence; 
    // no attenuation for observer
    if (rating.rater != observer) 
      weight = weight * (params.attenuation);
    // add to sums
    this.sums.weights += weight
    this.sums.products += weight * rating.score
    // if(rater?.subject == sampleid){
    //   console.log("GrapeRank : Calculate : sample card subject : ",this.card.subject)
    //   console.log("GrapeRank : Calculate : sample card sums : ",this.sums)
    // }
  }

  // STEP D : calculate influence
  calculate(params : types.EngineParams){
    // TODO if weights < 0 = "bots and bad actors" ... 
    // maybe we should store a weighted blacklist of 'rejected'?
    if(!this.card.calculated){
      if(this.sums.weights > params.minweight){
        const average = this.sums.products / this.sums.weights
        // STEP E : calculate confidence
        this.card.confidence = this.calculateConfidence(params.rigor)
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