import type { CalculatorParams, CalculatorSums, elemId, GrapevineData, InterpreterResults, protocol, Rating, RatingsList, Scorecard, ScorecardData, ScorecardMeta, ScorecardsRecord, scoreindex, timestamp, userId, WorldviewCalculation, WorldviewKeys, WorldviewSettings } from "../types"

let keys : Required<WorldviewKeys>
let calculator : Required<CalculatorParams>
let settings : WorldviewSettings
let calctimestamp : timestamp
let ratings : RatingsList 
// const ratercards : Map<userId,Scorecard> = new Map()
const calculators : Map<elemId,ScorecardCalculator> = new Map()

const DefaultParams : Required<CalculatorParams> = {
  // incrementally decrease influence weight
  attenuation : .5,
  // factor for calculating confidence 
  // MUST be bellow 1 or confidence will ALWAYS be 0
  rigor : .7,
  // minimum score ABOVE WHICH scorecard will be included in output
  minscore : -1,
  // max difference between calculator iterations
  // ZERO == most precise
  precision : 0,
  // devmode if off by default
  devmode : false
}

/**
 * Calculate new scorecards from interpreted ratings and input scorecards
 */
export function calculate ( R : RatingsList, K : Required<WorldviewKeys>, W : WorldviewSettings) : WorldviewCalculation {

  keys = K
  settings = W
  ratings = R
  calculator = {
    ...DefaultParams,
    ...W.calculator
  }
  // let scorecards : Scorecard[] = []
  console.log("GrapeRank : Calculator : instantiated with ",ratings.length," ratings.")

  // setup
  // STEP A : initialize ratee scorecard
  // Retrieve or create a ScorecardCalculator for each ratee in ratings
  for(let r in ratings){
    let ratee = ratings[r].ratee
    let rater = ratings[r].rater
    if(ratee && !calculators.get(ratee)){
      // TODO get scores for each rater from worldview input cards
      // let ratercard = getInputScorecard(rater as string)
      let calculator = new ScorecardCalculator( ratee )
      if(calculator) calculators.set(ratee, calculator)
    }
  }
  console.log("GrapeRank : Calculator : setup with ",calculators.size," calculators.")
  // if(!calculators.has(keys.observer as string))
  //   throw('GrapeRank : Calculator : missing oberver calculator')

  // iterate
  calctimestamp = Date.now()
  let calculated = 0
  let iteration = 0
  while(calculated < calculators.size){
    iteration ++
    calculated = iterate(iteration)
  }

  // output
  const calculationdata : WorldviewCalculation = {
    timestamp : calctimestamp,
    grapevine : outputGrapevineData(),
    scorecards : outputScorecardsData()
  }

  console.log("GrapeRank : Calculator : output WorldviewCalculation : ",{...keys, calctimestamp})
  return calculationdata
}


let totalcalculated = 0
// returns number of scorecards calculated
function iterate(iteration : number) : number {
  let thistotalcalculated = 0
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
  // calculate final influence and confidence for each ratee scorecard
  // call calculate again if calculation is NOT complete
  calculators.forEach( calculator => { 
    if( !calculator.calculated ){
      calculator.calculate()
    }else{
      thistotalcalculated ++
    }
  }) 

  // LOG iteration
  logScoresForIteration()
  console.log("TOTAL number scorecards : ", calculators.size )  
  console.log("TOTAL scorecards calculated : ", thistotalcalculated)

  if(iteration > 10 && thistotalcalculated == totalcalculated){
    console.log("HALTING iterator : no new scores calculated")
    thistotalcalculated = calculators.size
  }
  if(iteration > 100){
    console.log("HALTING iterator : exeded MAX 100 iterations in calculate ")
    thistotalcalculated = calculators.size
  }

  console.log("------------ END ITERATION : ", iteration, " --------------------")
  return thistotalcalculated

}

function outputGrapevineData() : GrapevineData {
  // TODO set expires from calculator params at time of calculation 
  let expires = false
  let summary : Record<scoreindex, number>  = new Scoreindex()
  calculators.forEach((calculator) => {
    if(calculator.output) {
      let scoreindex = Math.round(calculator.output[1].score * 100) as scoreindex
      let scorecount = ( summary[scoreindex] || 0 ) + 1
      summary[scoreindex] = scorecount
    }
  })
  return { summary, expires}
}

function outputScorecardsData() : ScorecardsRecord {
  let scorecards : Record<elemId, Required<ScorecardData>> = {}
  calculators.forEach((calculator) => {
    let output = calculator.output
    if(output) {
      scorecards[output[0]] = output[1]
    }
  })
  // return scorecards.sort((a ,b )=>{
  //   return  b[1].score - a[1].score ||  b[1].input['nostr-follows']?.count - a[1].input['nostr-follows']?.count 
  // })
  return scorecards
}


const zerosums : CalculatorSums = {
  weights : 0,
  products : 0
}

/**
 * Calculates a single scorecard for a given subject (ratee)
 */
class ScorecardCalculator {

  get output() : [elemId, Required<ScorecardData>] | undefined {
    if(!this.calculated || this._data.score <= calculator.minscore) return undefined
    return [ this._subject, this._data ]
  }
  get scorecard() : Required<Scorecard> | undefined { 
    // if(!this.calculated) return undefined
    return {
      ...keys,
      subject : this._subject,
      timestamp: calctimestamp,
      ...this._data
    }
  }
  // sum() can only be run as many times as we have ratings
  // get summed(){ return this._sumcount < ratings.length ? false : true }
  get calculated(){ 
    return this._calculated ? true : false
  }

  // constructor(subject : elemId)
  // constructor(scorecard : Scorecard)
  constructor(input : elemId | Scorecard){
      // input is subject of new scorecard
      this._subject = typeof input == 'string' ?  input :  input.subject as string
  }

  // STEP B : calculate sums
  // calculate sum of weights & sum of products
  sum( rating : Required<Rating>, ratercard? : Scorecard){
    
    // do nothing if ratercard.subject does not match rating.rater
    if(ratercard && ratercard.subject != rating.rater){
      console.log("GrapeRank : ScorecardCalculator : WARNING ratercard.subject does not match rating.rater")
      return
    }

    // only run sum() if calculator iterations are NOT completed
    if(this.calculated) return

    // determine rater influence
    let influence = rating.rater == keys.observer ? 1 : ratercard?.score ? ratercard.score as number : 0
    let weight = influence * rating.confidence; 
    // no attenuation for observer
    if (rating.rater != keys.observer) 
      weight = weight * (calculator.attenuation);

    // add to sums
    this._sums.weights += weight
    this._sums.products += weight * rating.score

    // get the metadata entry for this protocol
    let protocolmeta = this._meta.get(rating.protocol)
    // create new metadata entry for this protocol, using existing values as available
    protocolmeta = { 
      index : rating.index,
      // dos = the minimum nonzero iteration number for ratings used to calculate this scorecard 
      dos : 
        rating.iteration && protocolmeta?.dos && rating.iteration < protocolmeta.dos ? 
          rating.iteration : protocolmeta?.dos || rating.iteration,
      // weighted = weighted sum of protocol ratings calculated in this scorecard
      weighted : weight + (protocolmeta?.weighted || 0),
      // numRatings = number of protocol ratings for this subject
      numRatings : 1 + (protocolmeta?.numRatings || 0),
      // numRatedBy = number of protocol ratings for observer by this subject
      numRatedBy : (rating.ratee == keys.observer ? 1 : 0) + (protocolmeta?.numRatedBy || 0)
    }
    // assure that the metadata entry is updated for this protocol, in case it was undefined before.
    this._meta.set(rating.protocol, protocolmeta)
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
    let meta : Record<protocol,ScorecardMeta> = {}

    // convert metadata map to pojo
    this._meta.forEach((scorecardmeta,protocol) => meta[protocol] = scorecardmeta )

    // If weights == 0 then confidence and score will also be 0
    if(this._sums.weights > 0){
      // STEP D : calculate confidence
      confidence = this.confidence
      score = this._average * confidence
    }

    // determine if calculator iterations are complete based on calculator.precision
    // ONLY after scores have been calculated at least ONCE (if `this._claculated` has been set)
    this._calculated = this._calculated === undefined ? false 
      : Math.abs(score - this._data.score) <= calculator.precision ? true : false

    // zero the sums
    this._sums  = {...zerosums};

    // output the scorecard
    this._data = { confidence, score, meta }
    return this.calculated
  }

  private _calculated : boolean | undefined
  private _subject : elemId 
  private _data : Required<ScorecardData> 
  private _meta : Map<protocol, ScorecardMeta> = new Map()
  // TODO refactor this._sums as this._input in the format of scorecard.input
  private _sums : CalculatorSums = {...zerosums}
  private get _average(){ 
    return this._sums.products / this._sums.weights
  }
  // STEP D : calculate confidence
  private get confidence(){
    // TODO get default rigor
    let rigor = calculator.rigor !== undefined ? calculator.rigor : .25
    const rigority = -Math.log(rigor)
    const fooB = -this._sums.weights * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }

}


// LOG iteration
function logScoresForIteration(){

    let scorecards : Scorecard[] = [] 
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
}


function countScorecardsByScore(scorecards : Scorecard[], increment : number ) : number[] {
  let grouped = groupScorecardsByScore(scorecards,increment)
  let count : number[] = []
  let index = 0
  for(let g in grouped){
    count[index] = grouped[g].length
    index ++
  }
  return count
}

function groupScorecardsByScore(scorecards : Scorecard[], increment : number ) : Scorecard[][] {
  let group : Scorecard[][] = []
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
// FIXME this will NOT WORK since input is NO LONGER a list of scorecards
function getInputScorecard(subject : elemId) : Scorecard | undefined{
  let scorecard : Scorecard | undefined = undefined
  for(let s in settings.input){
    if(subject == settings.input[s].subject) {
      scorecard =  settings.input[s]
    }
  }
  return scorecard
}

function getRating(rater:userId, ratings:RatingsList = []) : Rating | undefined{
  for(let r in ratings){
    if(rater == ratings[r].rater) return ratings[r]
  }
}

class Scoreindex implements Record<scoreindex, number> {
  constructor(){
    for(let i = 0; i <= 100; i++) { this[i] = 0; }
  }
  0: number
  2: number
  1: number
  10: number
  100: number
  3: number
  4: number
  5: number
  6: number
  7: number
  8: number
  9: number
  11: number
  12: number
  13: number
  14: number
  15: number
  16: number
  17: number
  18: number
  19: number
  20: number
  21: number
  22: number
  23: number
  24: number
  25: number
  26: number
  27: number
  28: number
  29: number
  30: number
  31: number
  32: number
  33: number
  34: number
  35: number
  36: number
  37: number
  38: number
  39: number
  40: number
  41: number
  42: number
  43: number
  44: number
  45: number
  46: number
  47: number
  48: number
  49: number
  50: number
  51: number
  52: number
  53: number
  54: number
  55: number
  56: number
  57: number
  58: number
  59: number
  60: number
  61: number
  62: number
  63: number
  64: number
  65: number
  66: number
  67: number
  68: number
  69: number
  70: number
  71: number
  72: number
  73: number
  74: number
  75: number
  76: number
  77: number
  78: number
  79: number
  80: number
  81: number
  82: number
  83: number
  84: number
  85: number
  86: number
  87: number
  88: number
  89: number
  90: number
  91: number
  92: number
  93: number
  94: number
  95: number
  96: number
  97: number
  98: number
  99: number
}