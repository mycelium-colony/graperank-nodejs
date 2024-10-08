
/**
 * Primitives
 */
export type userId = string | number
export type kindId = string | number
export type elemId = string
export type context = string
export type slug = string // required : [lowercase] allowed : [numbers, hyphen, underscore]

export type ParamValue = string | number | boolean
export type ParamsArray = Array<ParamValue> 
export type ParamsObject = {
  [k:string] : ParamValue
}
// export type className = string


/**
 * GrapeRank Engine API Request
 * parameters for calculating a Grapevine using one or more protocols
 * Requests should return EngineResponse 
 */
export type EngineRequest = {
  // 
  observer : userId,
  //
  context : context,
  // 
  input? : Scorecard[],
  // any number of interpretations may be processed in a given request.
  interpretors?: InterpreterRequest[],
  params: Partial<EngineParams>
  dev? : Partial<DevParams>
}
export type InterpreterRequest = {
  domain? : string,
  protocol : slug // '[source]-[dataype]' : 'nostr-follows' 
  params? : ProtocolParams
  authors? : userId[] // optional alist of userId
}
export type ProtocolParams = {
  score? : number,
  confidence? : number,
  depth? : number, // TODO a bunch of logic needed to implement variable depths in interpretor and growing user lists for calculator
  [param:string] : ParamValue | undefined,
}
export type EngineParams = {
  // default infulence score 
  // score : number 
  // incrementally decrease influence weight
  attenuation : number  // 0 -1 
  // factor for calculating confidence
  rigor : number // 0 -1
  // minimum weight for scorecard to be calculated
  minweight : number // 0 - 1 
  // max difference between calculator iterations
  // ZERO == most precise
  precision : number
}

export type DevParams = {
  samplerater? : userId,
  sampleratee? : elemId
}

/**
 * GrapeRank Engine API Response
 * Returns `output` from engine as ScorecardValuess
 * 
 * MAY include `interpretors` and `calculator` as JsonSchema 
 * parameter definitions for calling EngineRequest again,
 * IF output cannot be generated
 */
export type EngineResponse = {
  observer? : userId
  output? : Scorecard[]
  interpretors? : {[protocol : slug] : JsonSchema}
  calculator? : JsonSchema
}
export type JsonSchema = {
  required : slug[], 
  properties : {}
}


/**
 * A recipe for generating a ScorecardValuess list
 * from ScorecardValuess input AND 
 */
export type Worldview = {
  observer : userId,
  context : slug,
  input? : Scorecard[],
  filters? : WorldviewFIlter[]
}

export type WorldviewFIlter = {
  engine : URL // "api.grapevine.my"
  interpretors : InterpreterRequest[]
  calculator : EngineParams
}




/**
 * G = Grapevine
 * Represents `Scorecard[]` as a Map
 * Use Grapevine Class to proccess Scorecards
 */
type Grapevine = Map<ScorecardKeys,ScorecardValues>
export type ScorecardKeys = Required<Pick<Scorecard, 'subject' |  'observer' | 'context'>>
export type ScorecardValues = Omit<Scorecard, 'subject' |  'observer' | 'context'>

export type Scorecard = {
  subject? : userId | elemId,
  observer? : userId,
  context? : context,
  calculated? : number, // timestamp of when score was calculated 
  // only confidence and influence score are public?
  confidence? : number, // 
  score? : number, // influence score
}


/**
 * R = RatingsList collected by Interpreters
 * input for GrapeRank calculations
 */
export type RatingsList = Rating[] 

export type Rating = {
  // observer? : userId,
  rater : userId,
  ratee : elemId,
  protocol : slug // '[source]-[dataype]' : 'nostr-follows' 
  confidence : number // 0 - 1
  score : number // 0 or 1 / percent
}



/**
 * User Parameters for GrapeRank
 * P input for GrapeRank
 */
// export type P = {
//   observer: userId
//   calculator : EngineParams
// }


export type CalculatorSums = {
  weights : number,
  products : number,
}

export type ScorecardDafults = {
  confidence : number // 0 - 1
  // score : number // number
  score : number // number
}


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
export type oneorzero = 0 | 1
export type onetofive = 1 | 2 | 3 | 4 | 5
export type onetoten = IntRange<1,10>
