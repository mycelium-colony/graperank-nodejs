
/**
 * Primitives
 */
export type userId = string | number
export type kindId = string | number
export type elemId = string
export type context = string // must be unique for each observer
export type GID = [context, userId] 

export type ParamValue = string | number | boolean
export type ParamsArray = Array<ParamValue> 
export type ParamsObject = {
  [k:string] : ParamValue
}


/**
 * A Ratings Table per Event Kind for ALL of Nostr
 * Input for GrapeRank calculations
 * pubkey = rater
 * elemId = being rated
 */
export type R = Record<
  userId, Record<
    elemId, Rating | undefined >>

export type Rating = {
  confidence : number // 0 - 1
  score : number // 0 or 1 / percent
  context? : string[] // [ [domain], [interpretor], [kind] ]
}


/**
 * A Scorecards Table 
 * Input and output from GrapeRank calculations
 * pubkey = observer
 * elemId = being observed
 */
export type G = Record< 
    userId, Record< 
      elemId, Scorecard >>

export type Scorecard = {
  readonly GID : GID
  readonly UID : elemId
  // public sig : signature
   influence : number, // non negative number 
   average : number, // number
   weights : number, // non negative number 
   confidence : number, // 0 - 1
   totals : number, // mutable
   context? : context // TODO  // must be unique for each observer
}


/**
 * User Parameters for GrapeRank
 */
export type P = {
  observer: userId
  attenuation : number // 0 -1 
  rigor : number // 0 -1
  default : {
    confidence : number // 0 - 1
    score : number // number
    influence : number // number
  }
}


/**
 * API for interpretation engine
 */
export type InterpretorParams = {
  raters : userId[] // an array of user identifiers (nostr pubkeys) for which to fetch and interpret data.
  interpretor : string // class name of InterpretorClass implementor
  interpretations : InterpretationParams[] // any number of interpretations for fetched data may be processed in a given request.
}
export type InterpretationParams = {
  kind : kindId // any identifyer of a datatype (nostr event kind number) for which to fetch data and interpret results
  filter? : ParamsObject | ParamsArray // a filter object or array used for fetching data for this kind
  prefs? : ParamsObject // an array of args passed (after first arg) into the Interpretation callback for this kind
}
export type InterpretableData = Record<kindId, Record< userId, any[]>>



/**
 * IntRange
 * https://ricardobalk.nl/blog/typescript/ranged-numbers
 * 
 * example :
 * type percent = IntRange<0,100>
 * let myvalue : percent = 101 // ERROR
 */
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>
// type Enumerate<N extends number> = Partial<Record<keyof any, never>> extends infer O ? { [K in keyof O]: K extends N ? never : K } : never;
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type percent = IntRange<0,101>
export type onetofive = IntRange<1,5>