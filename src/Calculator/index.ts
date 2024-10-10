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
  console.log("GrapeRank : Calculator : instantiated with ",ratings.length," ratings and ",engine.input.length," input scorecards.")

  // setup
  // STEP A : initialize ratee scorecard
  // Retrieve or create a ScorecardCalculator for each ratee in ratings
  for(let r in ratings){
    let ratee = ratings[r].ratee
    let rater = ratings[r].rater
    if(!calculators.get(ratee)){
      let ratercard = getInputScorecard(rater as string)
      let calculator = new ScorecardCalculator( ratercard || ratee )
      if(calculator) calculators.set(ratee, calculator)
    }
  }
  console.log("GrapeRank : Calculator : setup with ",ratercards.size," ratercards and ",calculators.size," calculators.")

  // iterate
  let calculated = 0
  let iteration = 0
  while(calculated < calculators.size){
    iteration ++
    calculated = iterate(iteration)
  }

  // output
  scorecards = output()

  console.log("GrapeRank : Calculator : output : ",scorecards.length," scorecards.")
  return scorecards
}


// returns number of scorecards calculated
function iterate(iteration : number) : number {
  let calculated = 0
  console.log("------------ BEGIN ITERATION : ", iteration, " --------------------")
  
  // STEP B : calculate sums
  // Add rater's rating to the sum of weights & products for the ratee scorecard
  for(let r in ratings){
    let calculator = calculators.get(ratings[r].ratee)
    let ratercard = calculators.get(ratings[r].rater as string)?.scorecard
    if(calculator) {

      calculator.sum( ratings[r], ratercard)
    }
  }

  // STEP C : calculate influence
  // calculate final influence and conficdence for each ratee scorecard
  calculators.forEach( calculator => { 
    if( !calculator.calculated ){
      calculator.calculate()
    }else{
      calculated ++
    }
  })
    
  // LOG iteration
  logScoresForIteration()

  console.log("TOTAL number scorecards calculated : ", calculated)
  console.log("------------ END ITERATION : ", iteration, " --------------------")
  if(!calculated && iteration > 50){
    throw(new Error("HALTING recursive loop with output "),output())
  }
  return calculated

}

function output(){
  let scorecards : types.Scorecard[] = []
  calculators.forEach((calculator) => {
    if(typeof calculator.scorecard?.score == 'number') 
        scorecards.push(calculator.scorecard)
  })
  return scorecards
}


const zerosums : types.CalculatorSums = {
  weights : 0,
  products : 0
}

/**
 * Calculates a single scorecard for a given subject (ratee)
 */
class ScorecardCalculator {

  get scorecard(){ return this._scorecard }
  // sum() can only be run as many times as we have ratings
  // get summed(){ return this._sumcount < ratings.length ? false : true }
  get calculated(){ return this._calculated }

  // constructor(subject : types.elemId)
  // constructor(scorecard : types.Scorecard)
  constructor(input : types.elemId | types.Scorecard){
    let template = {
      observer : engine.observer,
      context : engine.context,
    } 
    this._scorecard = typeof input == 'string' ? 
     {...template, subject : input } :
     {...input, ...template}
  }

  // STEP B : calculate sums
  // calculate sum of weights & sum of products
  sum( rating : types.Rating, ratercard? : types.Scorecard){
    
    // do nothing if ratercard.subject does not match rating.rater
    if(ratercard && ratercard.subject != rating.rater){
      console.log("GrapeRank : ScorecardCalculator : WARNING ratercard.subject does not match rating.rater")
      return
    }
    // only run sum() UNTIL summed is complete
    // if(this.summed) return
    // only run sum() if calculator iterations are NOT completed
    if(this.calculated) return


    let oldsums = {...this._sums}
    // determine rater influence
    let influence = ratercard?.score !== undefined ? ratercard.score as number: 
    ratercard?.subject == engine.observer ? 1 : 0
    let weight = influence * rating.confidence; 
    // no attenuation for observer
    if (rating.rater != engine.observer) 
      weight = weight * (engine.params.attenuation);
    // add to sums
    this._sums.weights += weight
    this._sums.products += weight * rating.score
    // increment sumcount to reflect how many times sum() has been run
    // this._sumcount ++

    if(this.scorecard.subject == engine.dev.sampleratee && ratercard?.subject  == engine.dev.samplerater){
      console.log("GrapeRank : ScorecardCalculator : sample rater : influence = ", ratercard?.score as number)
      console.log("GrapeRank : ScorecardCalculator : sample rater : rating.score = ", rating.score as number)
      console.log("GrapeRank : ScorecardCalculator : sample rater : old scorercard.sums = ", oldsums)
      console.log("GrapeRank : ScorecardCalculator : sample rater : new scorecard.sums = ", this._sums)
    }
  }

  // STEP C : calculate influence
  // returns true if score was updated
  calculate() : boolean {

    // only run calculate() WHEN summed is complete
    // if(!this.summed) return false
    // only calculate if calculator iterations have not completed
    if(this.calculated) return true

    // calculate score
    let confidence = 0
    let score = 0
    // If weights == 0 then confidence and score will also be 0
    if(this._sums.weights > (engine.params.minweight || 0)){
      // STEP D : calculate confidence
      confidence = this.confidence
      score = this._average * confidence
    }

    // determine if calculator iterations are complete based on engine.params.precision
    // ONLY after scores have been calculated at least ONCE
    if(this._scorecard.score !== undefined)
    this._calculated = Math.abs(score - this._scorecard.score) <= engine.params.precision ? true : false
    // zero the sums
    this._sums  = {...zerosums};
    // output the scorecard
    this._scorecard = {
      ...this._scorecard,
      confidence, score,
      calculated : this._calculated ? new Date().valueOf() : undefined
    }
    return this._calculated
  }

  // private _sumcount : number = 0
  private _calculated : boolean = false
  private _scorecard : types.Scorecard
  private _sums : types.CalculatorSums = {...zerosums}
  private get _average(){ 
    return this._sums.products / this._sums.weights
  }
  // STEP D : calculate confidence
  private get confidence(){
    // TODO get default rigor
    let rigor = engine.params.rigor !== undefined ? engine.params.rigor : 1
    const rigority = -Math.log(rigor)
    const fooB = -this._sums.weights * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }

}


// LOG iteration
function logScoresForIteration(){

    let scorecards : types.Scorecard[] = [] 
    let increment  = .1
    let scores : number[] 
    let v = "", ov = ""

    calculators.forEach((calculator) => {
      if(calculator.scorecard) scorecards.push( calculator.scorecard)
    })

    scores = countScorecardsByScore(scorecards, increment)
    // console.log("scores counted", scores)

    for(let i in scores){
      ov = v || "0"
      v = ((i as unknown as number) * increment).toPrecision(2)
      console.log("number of cards having scores from "+ ov +" to " +v+ " = ", scores[i])
    }
    console.log("TOTAL number scorecards = ",scorecards.length)  
}


function countScorecardsByScore(scorecards : types.Scorecard[], increment : number ) : number[] {
  let grouped = groupScorecardsByScore(scorecards,increment)
  let count : number[] = []
  let index = 0
  for(let g in grouped){
    count[index] = grouped[g].length
    index ++
  }
  return count
}

function groupScorecardsByScore(scorecards : types.Scorecard[], increment : number ) : types.Scorecard[][] {
  let group : types.Scorecard[][] = []
  for(let s in scorecards){
    let card = scorecards[s]
    if(card?.score != undefined){
      let groupid = Math.floor(card.score / increment)
      if(!group[groupid]) group[groupid] = []
      group[groupid].push(card)
    }
  }
  return group
}





// STEP A : get rater influence from input scorecards
function getInputScorecard(subject : types.elemId) : types.Scorecard | undefined{
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