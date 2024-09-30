import * as types from "../types"

// shorthand for types
type ScorecardKeys = types.ScorecardKeys
type ScorecardValues = types.ScorecardValues
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
    observer : Pick<ScorecardKeys,"observer">, 
    context : Pick<ScorecardKeys,"context">,
    engineparams : types.EngineParams,
    ratings : Rating[], 
    scorecards? : Scorecard[] 
  ){
    let mapable : [ScorecardKeys,ScorecardValues][] = []
    let raterScore : number | undefined
    let key : GrapevineKey
    let value : GrapevineValue

    for(let i in ratings){
      raterScore = scorecards ? 
        Grapevine.getScorecard({subject:ratings[i].rater}, scorecards)?.score :
        GrapevineValue.defaults().score
      key = new GrapevineKey(ratings[i], raterScorecard, overwrite),
      value = new GrapevineValue(ratings[i], raterScorecard, overwrite)

      mapable.push([key,value])
    }
    super(mapable)
  }

  get(key: GrapevineKey | ScorecardKeys) : GrapevineValue | undefined{
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

  set(key: ScorecardKeys, value: ScorecardValues): this {
    // TODO confirm unique key props
    return super.set(key, value)
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
  import(cards : Scorecard[] | Rating[], keyprops? : Partial<ScorecardKeys>, valueprops? : Partial<ScorecardValues>, overwrite = false){
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
   * @param map The grapevine map to update
   * @param keys a subset (array) of keys upon which to operate
   * @returns a new Grapevine instance with new keys in the same order.
   */
  static remap(keyprops : Partial<ScorecardKeys>, map: Grapevine, keys?:ScorecardKeys[]){
    let remapped = new Grapevine() 
    map.forEach((value, key, map) => {
      if(!keys || keys.includes(key)){
        let newkey = {...key, ...keyprops}
        remapped.set(newkey, value)
      }
    })
    return remapped
  }

  static getScorecard(key: Partial<ScorecardKeys>, cards:Scorecard[]) : Scorecard | undefined{
    for(let c in cards){
      for(let k in key){
        if(!!key[k] && key[k] != cards[c][k]) break
        return cards[c]
      }
    }
  }

}

class GrapevineKey implements ScorecardKeys {
  subject: types.userId
  observer: types.userId
  context: string

  constructor(card:Scorecard | Rating, merge? : Partial<Scorecard>, overwrite = false) {
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
  matches(key: Partial<ScorecardKeys>) : boolean{
    for(let k in key){
      if(!!key[k] && key[k] != this[k]) break
      return true
    }
    return false
  }
}


class GrapevineValue implements ScorecardValues {
  
  static defaults() : ScorecardValues {
    //TODO set default score and confidence
    // from preset or user prefs
    return {}
  }

  get calculated() {return this._calculated}
  get confidence(){ return this._confidence}
  get score() {return this._score}

  private _observer? : types.userId
  private _calculated? : number;
  private _confidence? : number;
  private _score? : number;
  private _sums : types.CalculatorSums = {
    weights : 0,
    products : 0
  }

  constructor(input?:Scorecard | Rating, merge? : Partial<Scorecard>, overwrite = false) {
    let values = overwrite ? 
      {...GrapevineValue.defaults, ...input, ...merge} : 
      {...GrapevineValue.defaults, ...merge, ...input}
      this._score = values.score 
      this._confidence = values.confidence
      this._calculated = values.calculated
  }


}

  
