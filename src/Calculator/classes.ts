import * as types from "../types"

// shorthand for types
type ScorecardKeys = types.ScorecardKeys
type ScorecardData = types.ScorecardData
type Scorecard = types.Scorecard
type Rating = types.Rating

/**
 * G = A Grapevine Map
 * Instantiates and proccess Scorecards as a Map
 * Constructor accepts an array of Scorcards or Ratings
 */
export class Grapevine extends Map<GrapevineKey,GrapevineValue
>{

  constructor(
    ratings : Rating[], 
    scorecards? : Scorecard[] 
  ){
    let iterable :  Array<readonly [GrapevineKey, GrapevineValue]> = []
    let ratercard : Scorecard | undefined
    let key : GrapevineKey
    let value : GrapevineValue

    for(let i in ratings){
      ratercard = scorecards ? 
        Grapevine.getScorecard({subject:ratings[i].rater}, scorecards) :
        Grapevine.newScorecard({subject:ratings[i].rater})
      key = new GrapevineKey(ratings[i], ratercard),
      value = new GrapevineValue(ratings[i], ratercard)

      iterable.push([key,value])
    }
    super(iterable)
  }

  get(key: ScorecardKeys) : GrapevineValue | undefined{
    // return matching object if key is instance of GrapevineKey
    if(key instanceof GrapevineKey)
      return super.get(key)
    // otherwise compare key props 
    let value : GrapevineValue | undefined
    this.forEach((thisvalue, thiskey, map) => {
      if(thiskey.matches(key)) value = thisvalue
    })
    return value
  }

  set(key: ScorecardKeys, value: ScorecardData): this {
    // convert value
    const newvalue = value instanceof GrapevineValue ? value : new GrapevineValue(value)
    // set existing key if instance of GrapevineKey
    if(key instanceof GrapevineKey)
      return super.set(key, newvalue)
    // otherwise ... locate existing key by ScorecardKeys
    this.forEach((thisvalue, thiskey, map) => {
      if(thiskey.matches(key)){ 
        thisvalue = newvalue
        return this
      }
    })
    // otherwise set new key && value
    return super.set(new GrapevineKey(key), newvalue)
  }

  /**
   * Export an array of Scorecards for JSON.strinify()
   * @returns an array of Scorcards
   */
  export() : Scorecard[] {
    const scorecards : Scorecard[] = [] 
    const entries = this.entries()
    for(let e in entries){
      scorecards.push({...entries[e][0],...entries[e][1]})
    }
    return scorecards
  }

  /**
   * Import an array of Scorecards or Ratings to this Grapevine 
   * @param cards 
   */
  import(cards : Scorecard[] | Rating[], keyprops? : Partial<ScorecardKeys>, valueprops? : Partial<ScorecardData>, overwrite = false){
    for(let i in cards){
      this.set( 
        new GrapevineKey(cards[i], keyprops, overwrite), 
        new GrapevineValue(cards[i], valueprops, overwrite)
      )
    }
  }

  /**
   * Update a Grapevine with new keys 
   * @param keyprops a partial ScorecardKeys of props to replace
   */
  updateKeys(keyprops : Partial<ScorecardKeys>){
    this.forEach((thisvalue, thiskey) => {
      thiskey.update(keyprops)
    })
  }


  static getScorecard(key: Partial<ScorecardKeys>, cards:Scorecard[]) : Scorecard | undefined{
    for(let c in cards){
      for(let k in key){
        if(!!key[k] && key[k] != cards[c][k]) break
        return cards[c]
      }
    }
  }

  static newScorecard(from? : Partial<Scorecard>) : Scorecard{
    return {
      ...GrapevineKey.defaults(from),
      ...GrapevineValue.defaults(from)
    }
  }

}

class GrapevineKey implements ScorecardKeys {
  subject: types.userId
  observer: types.userId
  context: string
  // TODO implement these properties
  scoreindex? : types.scoreindex
  timestamp : number

  static defaults(from? : Partial<ScorecardKeys>) : Required<ScorecardKeys> {
    //TODO set default score and confidence from preset or user prefs
    return {
      observer : '',
      context : '',
      subject : '',
      timestamp : 0,
      ...from
    }
  }

  constructor(card:ScorecardKeys | Scorecard | Rating, merge? : Partial<Scorecard>, overwrite = false) {
    this.subject = 
      overwrite && merge?.subject ? merge.subject : 
      'subject' in card  &&  card.subject ? card.subject  : 
      'ratee' in card && card.ratee ? card.ratee : 
      merge?.subject || ""
    if(!this.subject) throw(new Error('no subject for Scorecard'))

    this.observer = 
      overwrite && merge?.observer ? merge.observer : 
      'observer' in card &&  card.observer ? card.observer  : 
      merge?.observer || ""
    if(!this.observer) throw(new Error('no observer for Scorecard'))

    this.context = 
      overwrite && merge?.context ? merge.context : 
      'context' in card && card.context ? card.context  : 
      merge?.context || ""
    if(!this.context) throw(new Error('no context for Scorecard'))
  }

  // return true ONLY if ALL props in key match this
  matches(keyprops: Partial<ScorecardKeys>) : boolean{
    for(let k in keyprops){
      if(!!keyprops[k] && keyprops[k] != this[k]) break
      return true
    }
    return false
  }
  update(keyprops: Partial<ScorecardKeys>){
    for(let k in keyprops){
      if(!!keyprops[k]) this[k] = keyprops[k]
    }
  }
}


class GrapevineValue implements ScorecardData {
  
  static defaults(from? : Partial<ScorecardData>) : Required<ScorecardData> {
    //TODO set default score and confidence from preset or user prefs
    return {
      confidence : 0,
      score : 0,
      input : { count:{}, dos:0, weights:0},
      ...from 
    }
  }

  get confidence(){ return this._confidence}
  get score() {return this._score}

  private _confidence? : number;
  private _score? : number;


  constructor(input?:ScorecardData | Rating, merge? : Partial<Scorecard>, overwrite = false) {
    let values = overwrite ? 
      {...GrapevineValue.defaults, ...input, ...merge} : 
      {...GrapevineValue.defaults, ...merge, ...input}
      this._score = values.score 
      this._confidence = values.confidence
  }


}

  
