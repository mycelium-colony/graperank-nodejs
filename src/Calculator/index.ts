import { GrapeRank } from ".."
import * as types from "../types"


let engine : GrapeRank
let ratings : types.Rating[] 
const ratercards : Map<types.userId,types.Scorecard> = new Map()
const calculators : Map<types.elemId,ScorecardCalculator> = new Map()

/**
 * Calculate new scorecards from interpreted ratings and input scorecards
 */
export function calculate ( R : types.Rating[], E : GrapeRank) : types.Scorecard[] {

  engine = E
  ratings = R
  let scorecards : types.Scorecard[] = []
  let iteration = 0, maxiterations = 8
  console.log("GrapeRank : Calculator : instantiated with ",ratings.length," ratings and ",engine.input.length," input scorecards.")

  // setup
  for(let r in ratings){
    let rating = ratings[r]
    let rater = rating.rater
    let ratee = rating.ratee

    // STEP A : get rater influence
    // retrieve and reference the rater from input scorecards
    if(!ratercards.get(rater)){
      let ratercard = getScorecard(rater as string)
      if(ratercard) ratercards.set(rater, ratercard)
    }

    // STEP B : initialize ratee scorecard
    // Retrieve or create a ScorecardCalculator for each ratee in ratings
    if(!calculators.get(ratee)){
      let calculator = new ScorecardCalculator( ratee )
      if(calculator) calculators.set(ratee, calculator)
    }
  }
  console.log("GrapeRank : Calculator : setup with ",ratercards.size," ratercards and ",calculators.size," calculators.")

  // iterate
  while(iteration < maxiterations){
    iteration ++
    iterate(iteration)
  }

  // output
  calculators.forEach((calculator) => {
    if(calculator.scorecard?.score) 
        scorecards.push(calculator.scorecard)
  })

  console.log("GrapeRank : Calculator : output : ",scorecards.length," scorecards.")
  return scorecards
}



function iterate( iteration : number ) : void {
  console.log("------------ BEGIN ITERATION --------------------")
  
  // STEP C : calculate sums
  // Add rater's rating to the sum of weights & products for the ratee scorecard
  let updatedratercards : Set<types.userId> = new Set()
  for(let r in ratings){
    let calculator = calculators.get(ratings[r].ratee)
    let ratercard = ratercards.get(ratings[r].rater)
    if(calculator) {
      if(ratercard?.calculated) {
        updatedratercards.add(ratings[r].rater)
        ratercard.calculated = undefined
      }
      calculator.sum( ratings[r], ratercard)
    }
  }
  console.log("GrapeRank : Calculator : ",updatedratercards.size," updated ratercards passed to calculator")

  // STEP D : calculate influence
  // calculate final influence and conficdence for each ratee scorecard
  calculators.forEach( calculator => calculator.calculate() )
    
  // LOG iteration
  logScoresForIteration(iteration)

  // STEP F : update rater scores
  // update ratercard score with new score from calculator
  let numupdated = 0
  let oldinfluence : number | undefined
  ratercards.forEach(( ratercard , rater) => {
    let ratee = ratercard.subject
    if( ratee ){
      let calculator = calculators.get(ratee as string)
      if(calculator?.scorecard?.score != undefined ){
        if(calculator.scorecard.score != ratercard.score){ 
          oldinfluence = ratercard.score
          ratercard.score = calculator.scorecard.score 
          ratercard.calculated = new Date().valueOf()
          let updatedratercard = ratercards.get(rater)
          if(updatedratercard?.score == calculator?.scorecard?.score) {
            numupdated ++
            if(updatedratercard.subject == engine.dev.samplerater)
            console.log("GrapeRank : Calculator : updated sample rater influence from ",oldinfluence," to ", updatedratercard.score)
          }
        }
      }
    }
  })
  console.log("GrapeRank : Calculator : updated ",numupdated," of ",ratercards.size," ratercards.")

  console.log("------------ END ITERATION --------------------")

}



class ScorecardCalculator {

  readonly scorecard : types.Scorecard = {}

  get calculated(){ 
    return this.scorecard.calculated ? true : false
  }

  private sums : types.CalculatorSums = {
    weights : 0,
    products : 0
  }

  constructor(subject : types.elemId){
    this.scorecard = {
      subject,
      observer : engine.observer,
      context : engine.context,
    }
  }

  // STEP C : calculate sums
  // calculate sum of weights & sum of products
  sum( rating : types.Rating, ratercard? : types.Scorecard){
    if(ratercard && ratercard.subject != rating.rater){
      // do nothing if ratercard subject does not match rater
      console.log("GrapeRank : ScorecardCalculator : WARNING ratercard.subject does not match rating.rater")
      return
    }
    let oldsums = {...this.sums}
    // determine rater influence
    let influence = ratercard?.score !== undefined ? ratercard.score as number: 
    ratercard?.subject == engine.observer ? 1 : 0
    let weight = influence * rating.confidence; 
    // no attenuation for observer
    if (rating.rater != engine.observer) 
      weight = weight * (engine.params.attenuation);
    // add to sums
    this.sums.weights += weight
    this.sums.products += weight * rating.score

    if(this.scorecard.subject == engine.dev.sampleratee && ratercard?.subject  == engine.dev.samplerater){
      console.log("GrapeRank : ScorecardCalculator : sample rater : influence = ", ratercard?.score as number)
      console.log("GrapeRank : ScorecardCalculator : sample rater : rating.score = ", rating.score as number)
      console.log("GrapeRank : ScorecardCalculator : sample rater : old scorercard.sums = ", oldsums)
      console.log("GrapeRank : ScorecardCalculator : sample rater : new scorecard.sums = ", this.sums)
    }
  }

  // STEP D : calculate influence
  calculate(){
    // TODO if weights < 0 = "bots and bad actors" ... 
    // maybe we should store a weighted blacklist of 'rejected'?
    if(!this.scorecard.calculated){
      if(this.sums.weights > (engine.params.minweight || 0)){
        const average = this.sums.products / this.sums.weights
        // STEP E : calculate confidence
        this.scorecard.confidence = this.calculateConfidence(engine.params.rigor)
        this.scorecard.score = average * this.scorecard.confidence
        this.scorecard.calculated = new Date().valueOf()
      }
    }
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




// STEP A : get rater influence from input scorecards
function getScorecard(subject : types.elemId) : types.Scorecard | undefined{
  let scorecard : types.Scorecard | undefined = undefined
  for(let s in engine.input){
    if(subject == engine.input[s].subject) {
      scorecard =  engine.input[s]
    }
  }
  return scorecard
}

function getRating(rater:types.userId, ratings:types.RatingsList = []) : types.Rating | undefined{
  for(let r in ratings){
    if(rater == ratings[r].rater) return ratings[r]
  }
}


// LOG iteration
function logScoresForIteration( iteration : number){

    let scorecards : types.Scorecard[] = [] 
    let increment  = .1
    let scores : number[] 
    let v = "", ov = ""

    console.log("GrapeRank : Calculator : iteration " + iteration)

    calculators.forEach((calculator) => {
      if(calculator.scorecard) scorecards.push( calculator.scorecard)
    })

    scores = countScorecardsByScore(scorecards, increment)
    // console.log("scores counted", scores)

    for(let i in scores){
      ov = v || "0"
      v = ((i as unknown as number) * increment).toPrecision(1)
      console.log("number of cards having scores from "+ ov +" to " +v+ " = ", scores[i])
    }
    console.log("TOTAL number scorecards = ",scorecards.length)  
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
