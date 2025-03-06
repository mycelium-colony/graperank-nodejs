import { type GrapeRankGenerator } from ".."
import type { CalculatorParams, CalculatorSums, elemId, protocol, Rating, RatingsList, Scorecard, ScorecardData, ScorecardInterpretation, scoreindex, userId, Scorecards, CalculatorIterationStatus, GrapevineKeys, ScorecardsEntry } from "../types"
import { DEBUGTARGET } from "../utils"

// var params : Required<CalculatorParams>

var DefaultParams : Required<CalculatorParams> = {
  // incrementally decrease influence weight
  attenuation : .5,
  // factor for calculating confidence 
  // MUST be bellow 1 or confidence will ALWAYS be 0
  // CAUTION : too high (eg:.7) and users beyond a certain DOS (eg:2) will always have a score of zero
  rigor : .5,
  // minimum score ABOVE WHICH scorecard will be included in output
  minscore : 0,
  // max difference between calculator iterations
  // ZERO == most precise
  precision : 0,
  // devmode if off by default
  devmode : false
}

/**
 * Calculate new scorecards from interpreted ratings and input scorecards
 */
export async function calculate ( this : GrapeRankGenerator, ratings : RatingsList) : Promise<ScorecardsEntry[]> {
  var scorecards : ScorecardsEntry[]
  let params : Required<CalculatorParams> = {...DefaultParams, ...this.settings.calculator} 
  this.settings = {calculator : {...params}}

  console.log("GrapeRank : Calculator : instantiated with ",ratings.length," ratings and params : ", params)

  // setup
  // STEP A : initialize ratee scorecard
  // Retrieve or create a ScorecardCalculator for each ratee in ratings
  for(let r in ratings){
    let ratee = ratings[r].ratee
    let rater = ratings[r].rater
    if(ratee && !this.calculators.get(ratee)){
      // TODO get scores for each rater from worldview input cards
      // let ratercard = getInputScorecard(rater as string)
      let calculator = new ScorecardCalculator( this.keys, ratee , params)
      if(calculator) this.calculators.set(ratee, calculator)
    }
  }
  console.log("GrapeRank : Calculator : setup with ",this.calculators.size," calculators.")
  // if(!calculators.has(keys.observer as string))
  //   throw('GrapeRank : Calculator : missing oberver calculator')

  // iterate
  // calctimestamp = Date.now()
  await iterate(this, ratings)

  await this.updateCalculatorComplete() 
  
  // console.log("GrapeRank : Calculator : output GeneratorOutput : ",this.keys, this.grapevine)

  scorecards = outputScorecardsData(this)

  return scorecards
}


// returns number of scorecards calculated
async function iterate(generator : GrapeRankGenerator, ratings : RatingsList ) : Promise<number> {
  let calculating : number = 0
  let calculated : number = 0
  let uncalculated : string[]
  let notcalculatedwarning : number = 0
  let prevcalculating = 0
  let prevcalculated = 0
  let iteration = 0
  let iterationscores : number[] = []
  let iterationstatus : CalculatorIterationStatus

  while(calculated < generator.calculators.size){
    if(generator.stopped) return undefined
    iteration ++
    prevcalculating = calculating
    prevcalculated = calculated
    calculating = 0
    calculated = 0
    uncalculated = []
    iterationstatus = {}
    console.log("------------ BEGIN ITERATION : ", iteration, " --------------------")
    
    // STEP B : calculate sums
    // Add rater's rating to the sum of weights & products for the ratee scorecard
    for(let r in ratings){
      let calculator = generator.calculators.get(ratings[r].ratee)
      let ratercard = generator.calculators.get(ratings[r].rater as string)?.scorecard
      if(calculator) {
        calculator.sum( ratings[r], ratercard)
      }
    }

    // STEP C : calculate influence
    // calculate final influence and confidence for each ratee scorecard
    // call calculate again if calculation is NOT complete
    generator.calculators.forEach( (calculator, rater) => {
      var dos = calculator.dos || 0
      iterationstatus[dos] = iterationstatus[dos] || {
        calculated : 0,
        uncalculated : 0,
        average : 0
      }
      if( !calculator.calculated ){
        calculator.calculate()
        calculating ++
      }
      if(calculator.calculated){
        calculated ++
        // add to dos status for calculated
        iterationstatus[dos].calculated ++
        // DOS average is SUM of all calculated scores UNTIL converted to an average 
        iterationstatus[dos].average += calculator.score
      }else{
        uncalculated.push(rater)
        // add to dos status for uncalculated
        iterationstatus[dos].uncalculated ++
      }
    }) 
    // calculate averages scores for each DOS status
    for(var dos in iterationstatus){
      iterationstatus[dos].average = iterationstatus[dos].average / iterationstatus[dos].calculated 
    }
    await generator.updateCalculatorStatus({...iterationstatus})

    // LOG iteration
    iterationscores = logScoresForIteration(generator)

    console.log("TOTAL number scorecards : ", generator.calculators.size )  
    console.log("TOTAL scorecards calculating this iteration : ", calculating)
    console.log("TOTAL scorecards calculated : ", calculated)
    // halt iterator if needed
    if( uncalculated.length ){
      if(calculated == prevcalculated && calculating == prevcalculating ){
        notcalculatedwarning ++
        console.log("WARNING ",notcalculatedwarning," : scores did not change for ", calculating," scorecards in calculate()")
        if(notcalculatedwarning > 4) {
          console.log("HALTING iterator : due to unchanging scores for the following raters : ", uncalculated)
          calculated = generator.calculators.size
        }
      }
      if(iteration > 100){
        console.log("HALTING iterator : exeded MAX 100 iterations in calculate() ")
        calculated = generator.calculators.size
      }
    }
    console.log("------------ END ITERATION : ", iteration, " --------------------")
  }
  return calculated

}


function outputScorecardsData(generator : GrapeRankGenerator) : ScorecardsEntry[] {
  let scorecards : [elemId, Required<ScorecardData>][] = []
  generator.calculators.forEach((calculator) => {
    scorecards.push(calculator.output)
  })
  // sort first : scorecards with higher scores and most ratings
  return scorecards.sort((a ,b )=>{
    return  a[1].score - b[1].score ||  a[1].interpretersums['nostr-follows']?.numRatings - b[1].interpretersums['nostr-follows']?.numRatings 
  })
  // return scorecards
}


const zerosums : CalculatorSums = {
  weights : 0,
  products : 0
}

/**
 * Calculates a single scorecard for a given subject (ratee)
 */
export class ScorecardCalculator {

  get output() : [elemId, Required<ScorecardData>] | undefined {
    if(!this.calculated || this._data.score < this.params.minscore) return undefined
    return [ this._subject, this._data ]
  }
  get scorecard() : Required<Scorecard> | undefined { 
    // if(!this.calculated) return undefined
    return {
      ...this.keys,
      subject : this._subject,
      ...this._data
    }
  }
  // sum() can only be run as many times as we have ratings
  // get summed(){ return this._sumcount < ratings.length ? false : true }
  get calculated(){ 
    return this._calculated ? true : false
  }

  get dos() : number | undefined {
    // TODO interpreter should designate a protocol that determines DOS
    // using 'nostr-follows' for now
    return this._meta.get('nostr-follows')?.dos || 0
  }

  get score() : number {
    return this._data?.score || 0
  }
  // constructor(subject : elemId)
  // constructor(scorecard : Scorecard)
  constructor(private keys : Required<GrapevineKeys>, input : elemId | Scorecard, private params : Required<CalculatorParams>){
      // input is subject of new scorecard
      this._subject = typeof input == 'string' ?  input :  input.subject as string
  }

  // STEP B : calculate sums
  // calculate sum of weights & sum of products
  sum( rating : Rating, ratercard? : Scorecard){

    // do nothing if ratercard.subject does not match rating.rater
    if(ratercard && ratercard.subject != rating.rater){
      console.log("GrapeRank : ScorecardCalculator : WARNING ratercard.subject does not match rating.rater")
      return
    }

    // only run sum() if calculator iterations are NOT completed
    if(this.calculated) {
      return
    }

    // determine rater influence
    let influence = rating.rater == this.keys.observer ? 1 : ratercard?.score ? ratercard.score as number : 0
    let weight = influence * rating.confidence; 
    // no attenuation for observer
    if (rating.rater != this.keys.observer) 
      weight = weight * (this.params.attenuation);

    // add to sums
    this._sums.weights += weight
    this._sums.products += weight * rating.score

    // get the metadata entry for this protocol
    let protocolmeta = this._meta.get(rating.protocol)
    // create new metadata entry for this protocol, using existing values as available
    protocolmeta = { 
      // dos = the minimum nonzero iteration number for ratings used to calculate this scorecard 
      dos : 
        rating.dos && protocolmeta?.dos && rating.dos < protocolmeta.dos ? 
          rating.dos : protocolmeta?.dos || rating.dos,
      // weighted = weighted sum of protocol ratings calculated in this scorecard
      weighted : weight + (protocolmeta?.weighted || 0),
      // numRatings = number of protocol ratings for this subject
      numRatings : 1 + (protocolmeta?.numRatings || 0),
      // numRatedBy = number of protocol ratings for observer by this subject
      numRatedBy : (rating.ratee == this.keys.observer ? 1 : 0) + (protocolmeta?.numRatedBy || 0)
    }
    // assure that the metadata entry is updated for this protocol, in case it was undefined before.
    this._meta.set(rating.protocol, protocolmeta)

    // DEBUG
    if(this._subject == DEBUGTARGET){
      console.log('DEBUGTARGET : calculator._sums for target : ', this._sums)
      console.log('DEBUGTARGET : calculator._meta for target : ', this._meta)
    }
  }

  // STEP C : calculate influence
  // returns true if score was updated
  calculate() : boolean {

    if(this._subject == DEBUGTARGET){
      console.log('DEBUGTARGET : caling calculator.calculate() for target : ')
    }

    // only run calculate() WHEN summed is complete
    // if(!this.summed) return false
    // only calculate if calculator iterations have not completed
    if(this.calculated) return true

    // calculate score
    let confidence = 0
    let score = 0
    let interpretersums : Record<protocol,ScorecardInterpretation> = {}

    // convert metadata map to pojo
    this._meta.forEach((scorecardmeta,protocol) => interpretersums[protocol] = scorecardmeta )

    // If weights == 0 then confidence and score will also be 0
    if(this._sums.weights > 0){
      // STEP D : calculate confidence
      confidence = this.confidence
      score = this._average * confidence
    }

    // determine if calculator iterations are complete based on calculator.precision
    // ONLY after scores have been calculated at least ONCE (if `this._claculated` has been set)
    this._calculated = this._calculated === undefined ? false 
      : Math.abs(score - this._data.score) <= this.params.precision ? true : false

    // zero the sums
    this._sums  = {...zerosums};

    // output the scorecard
    this._data = { confidence, score, interpretersums }
    return this.calculated
  }

  private _calculated : boolean | undefined
  private _subject : elemId 
  private _data : Required<ScorecardData> 
  private _meta : Map<protocol, ScorecardInterpretation> = new Map()
  // TODO refactor this._sums as this._input in the format of scorecard.input
  private _sums : CalculatorSums = {...zerosums}
  private get _average(){ 
    return this._sums.products / this._sums.weights
  }
  // STEP D : calculate confidence
  private get confidence(){
    // TODO get default rigor
    let rigor = this.params.rigor !== undefined ? this.params.rigor : .25
    const rigority = -Math.log(rigor)
    const fooB = -this._sums.weights * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }

}


// LOG iteration
function logScoresForIteration(generator : GrapeRankGenerator) : number[] {

    let scorecards : Scorecard[] = [] 
    let increment  = .1
    let scores : number[] 
    let v = "", ov = ""

    generator.calculators.forEach((calculator) => {
      if(calculator.scorecard) scorecards.push( calculator.scorecard)
    })

    scores = countScorecardsByScore(scorecards, increment)
    // console.log("scores counted", scores)

    for(let i in scores){
      ov = v || "0"
      v = ((i as unknown as number) * increment).toPrecision(2)
      console.log("number of cards having scores from "+ ov +" to " +v+ " = ", scores[i])
    }
    return scores
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
