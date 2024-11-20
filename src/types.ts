/**
 * Primitives
 */
export type userId = string | number
export type kindId = string | number
export type elemId = string
export type context = string
export type protocol = string // required : [lowercase] allowed : [numbers, hyphen, underscore]
export type timestamp = number
export type timestring = string

export type ParamValue = string | number | boolean
export type ParamsArray = Array<ParamValue> 
export type ParamsObject = {
  [k:string] : ParamValue
}


// Worldview interfaces

export interface Worldview extends Required<WorldviewKeys>, WorldviewData {}
export type WorldviewKeys = {
  // observer is always required when requesting or instantiatng a worldview
  observer : userId,
  // context string may be ommitted when requesting
  context? : context,
}
export interface WorldviewData extends WorldviewSettings {
  calculated : Map<timestamp, GrapevineData >
}
export type WorldviewSettings = {
  // any worldview MAY use another (calculated) grapevine as input
  input? : GrapevineKeys,
  // any number of interpreters may be processed in a given worldview.
  interpreters: ProtocolRequest[],
  calculator?: Partial<CalculatorParams>,
}

// Grapevine interfaces

export interface Grapevine extends Required<GrapevineKeys>, GrapevineData {}

export interface GrapevineKeys extends Required<WorldviewKeys> {
  timestamp? : timestamp, // timestamp of when scores were calculated
}
export interface GrapevineData extends GrapevineMeta, GrapevineScores {
  summary : Map<scoreindex,number>, // number of calculated scorecards by scoreindex
}
export interface GrapevineMeta {
  expires? : number | false,
}
export interface GrapevineScores {
  scorecards?: Map<elemId, ScorecardData>
  scores? : Map<scoreindex, elemId[]> , // scorecard subjects grouped by scoreindex 
}

// Scorecard interfaces

// TODO rename `Scorecard` to `Observation`
// only {subject, score, confidence} is required for storage
export interface Scorecard extends 
  Required<Pick<ScorecardKeys,'subject'>>,
  Partial<Omit<ScorecardKeys, 'subject'>>,
  // Required<ScorecardKeys>,
  ScorecardData
  {}

export interface ScorecardKeys extends GrapevineKeys{
  subject? : userId | elemId,
}
// export interface ScorecardScoresKeys extends GrapevineKeys {
//   scoreindex? : scoreindex
// }
export type ScorecardData = {
  confidence? : number, // 
  // TODO rename `score` to `output`
  score? : number, // influence score
  // TODO add calculated weights to scorecard data
  // input = the sums of weights and weighted from each protocol in this calculation
  input? : ScorecardInput
}
export type ScorecardInput = {
  count : Record<protocol,number>, // number of ratings used this scorecard, grouped by protocol name
  dos : number, // the min nonzero `iteration` value from ALL ratings for this scorecard
  weights : number, // sum of weights for ALL ratings for this scorecard
}

// export type ScorecardDataTuple = [number,number] // [score, confidence]

// ALL properties are required for scorecard export (to external services)
export interface ScorecardExport extends Required<Scorecard> {}


// `Calculation` interfaces
export type WorldviewCalculation = { 
  timestamp : timestamp,
  grapevine : GrapevineDataStorage,
  scorecards : ScorecardsDataStorage
}

// `Storage` interfaces
// Client-side maps are retrieved from storage as an Array of Arrays 
// which may be passed to the Map constructor : `new Map(arrayfromstorage)`

// When 'worldview' is requested from storage, WorldviewDataStorage is returned
export interface WorldviewDataStorage extends WorldviewSettings {
  calculated? : Array<[timestamp, GrapevineDataStorage]>
}

// when 'grapevine' or GrapevineData is requested GrapevineDataStorage is returned
export interface GrapevineDataStorage extends GrapevineMeta {
  summary : GrapevineSummaryStorage, // number of calculated scorecards by scoreindex
  // scorecards? : ScorecardsDataStorage
}
export interface GrapevineSummaryStorage extends Array<[scoreindex, number]>{}
export interface ScorecardsDataStorage extends Array<[elemId, ScorecardData]>{}
export interface ScorecardsDataMap extends Map<elemId, ScorecardData>{}

// When 'scores' are requested from storage, an array of score arrays is returned
// which can be added and removed as needed from Grapevine.score
// export interface ScoresDataStorage {
//   scores? : [scoreindex, elemId[]][],
// }





// // WORLDVIEW DEMO
// // heres what might be recieved upon requesting a Worldview
// const myworldview : Worldview = {
//   observer : 'myuserid',
//   context : 'wot-nostrdevs',
//   input : {observer:'mysuerid', context : 'grapevine-wot'},
//   interpreters : [{
//     protocol : 'user-lists',
//     params : {'query':'developers,devs,nostrdevs'}
//   }],
//   calculated : new Map([
//     [ 12345678 , { 
//       summary : new Map([ [0,3], [1,5], [98,2], [99,5], [100,4] ]),
//       scores : new Map()
//       }
//     ]
//   ])
// }
// // get the latest calculated grapevine
// const latestgrapevine : GrapevineScores = myworldview.calculated?.entries().next().value()
//   // get the number of users who scored 100 in the latest calculation
// const numtrusted = latestgrapevine.summary?.get(100) // 4
// // get the number of score brackets (having users) above 95
// const scoresover95 = [...latestgrapevine.summary.keys()].filter((score) => score > 95) // [98,99,100]
// // append data AFTER requesting additional scores from storage
// import { mergeBigArrays } from "./utils"
// latestgrapevine.scores = new Map(await mergeBigArrays([...latestgrapevine.scores.entries()], [
//     [98, ['user21', 'user22']], 
//     [99, ['user991', 'user992', 'user993', 'user994', 'user995']], 
//     [100, ['user1001', 'user1002', 'user1003', 'user1004']]
// ]))
// // get top scoring users according to latest grapevine
// const userswithscore100 = latestgrapevine.scores.get(100) 
// const userswithscore99 = latestgrapevine.scores.get(99) 

// // GRAPEVINE DEMO
// // heres what might be recieved upon requesting the above as a grapevine
// const mygrapevine : Grapevine = {
//   observer : 'myuserid',
//   context : 'wot-nostrdevs',
//   timestamp : 12345678,
//   summary : new Map([ [0,3], [1,5], [98,2], [99,5], [100,4] ]),
//   scores : new Map([ 
//     [0, ['user01', 'user02', 'user03']], 
//     [1, ['user11', 'user12', 'user13', 'user14', 'user15']], 
//     [2, ['user21', 'user22']], 
//     [99, ['user991', 'user992', 'user993', 'user994', 'user995']], 
//     [100, ['user1001', 'user1002', 'user1003', 'user1004']]
//   ])
// }

/**
 * GrapeRank Engine API Request
 * parameters for calculating a Grapevine using one or more protocols
 * Requests should return EngineResponse 
 */
export interface EngineRequest {
  type : ApiTypeName
  keys : Partial<ScorecardKeys>
  data? : ApiDataTypes
}

export interface ApiRequest extends EngineRequest{
  op : ApiOperationName
}

export type ApiTypeName =  'worldview' | 'grapevine' | 'scorecards' 
export type ApiOperationName = 'list' | 'put' | 'get' | 'query' | 'delete'
export type ApiKeysTypes = WorldviewKeys | GrapevineKeys | ScorecardKeys | Required<ScorecardKeys>
export type ApiDataTypes = WorldviewDataStorage | GrapevineDataStorage | ScorecardsDataStorage

export type ApiOperation = {
  list? : any
  put? : any
  get? : any
  query? : any
  delete? : any
}

export type ApiTypeOperation = {
  worldview? : ApiOperation
  grapevine? : ApiOperation
  scorecards? : ApiOperation
}


export type InterpreterResults = {
  ratings : RatingsList
  responses : ProtocolResponse[]
}
export type ProtocolResponse = {
  protocol : protocol
  iteration : number
  numraters? : number
  numfetched? : number
  numratings? : number
}

export type ProtocolRequest = {
  // should the interpretation protocol be requested from another domain?
  // TODO specify an API over HTTP for ProtocolRequest and InterpreterResults 
  domain? : string,
  // machine readable name of the protocol 
  // in the format : '[source]-[datatype]', eg : 'nostr-follows' 
  protocol : protocol 
  // params to pass to the protocol
  // used for interpreting fetched content as new ratings
  params? : ProtocolParams
  // how deep should the protocol be run?
  // each iteration generates a list of new ratings from input authors
  // and also a list of new authors from each content or user being rated
  // this will be used as author input for the next iteration.
  iterate? : number,
  // initial authors list for fetching content and generating ratings
  // if left blank, observer ID will be used as a single author
  authors? : userId[] // optional alist of userId
}

export type ProtocolParams = {
  score : number,
  confidence : number,
  [param:string] : ParamValue | undefined,
}

export type CalculatorParams = {
  // default infulence score 
  // score : number 
  // incrementally decrease influence weight
  attenuation : number  // 0 -1 
  // factor for calculating confidence
  rigor : number // 0 -1
  // minimum weight for scorecard to be calculated
  minscore : number // 0 - 1 
  // max difference between calculator iterations
  // ZERO == most precise
  precision : number
  // TODO implement dev mode for engine
  devmode? : boolean
}

export type DevParams = {
  samplerater? : userId,
  sampleratee? : elemId
}

/**
 * GrapeRank Engine API Response
 * Returns `output` from engine as ScorecardDatas
 * 
 * MAY include `protocols` and `calculator` as JsonSchema 
 * parameter definitions for calling ApiRequest again,
 * IF output cannot be generated
 */
export type EngineResponse = {
  observer? : userId
  output? : Scorecard[]
  protocols? : {[protocol : protocol] : JsonSchema}
  calculator? : JsonSchema
}
export type JsonSchema = {
  required : string[], 
  properties : {}
}




/**
 * G = Grapevine
 * Represents `Scorecard[]` as a Map
 * Use Grapevine Class to proccess Scorecards
 */
// type Grapevine = Map<ScorecardKeys,ScorecardData>

/**
 * R = RatingsList collected by Interpreters
 * input for GrapeRank calculations
 */
// TODO rename `Rating` to `Interpretation` 
export type RatingsList = Required<Rating>[]
export type PartialRatingsList = Rating[] 


export type Rating = {
  // observer? : userId,
  rater : userId,
  ratee : elemId,
  protocol? : protocol // '[source]-[dataype]' : 'nostr-follows' 
  iteration? : number // minimum nonzero protocol iteration => DOS for this protocol in ratee scorecard
  confidence : number // 0 - 1
  // TODO rename 'score' to `value`
  score : number // 0 or 1 / percent
}



/**
 * User Parameters for GrapeRank
 * P input for GrapeRank
 */
// export type P = {
//   observer: userId
//   calculator : CalculatorParams
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


// export type StorageType = {[name:string]:[path:string]}

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
export type scoreindex = 
   0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 |
  10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
  20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
  30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 |
  40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 |
  50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 |
  60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 |
  70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 |
  80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 |
  90 | 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100

  // '0' |  '1' |  '2' |  '3' |  '4' |  '5' |  '6' |  '7' |  '8' |  '9' |
  // '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' |
  // '20' | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' |
  // '30' | '31' | '32' | '33' | '34' | '35' | '36' | '37' | '38' | '39' |
  // '40' | '41' | '42' | '43' | '44' | '45' | '46' | '47' | '48' | '49' |
  // '50' | '51' | '52' | '53' | '54' | '55' | '56' | '57' | '58' | '59' |
  // '06' | '61' | '62' | '63' | '64' | '65' | '66' | '67' | '68' | '69' |
  // '70' | '71' | '72' | '73' | '74' | '75' | '76' | '77' | '78' | '79' |
  // '80' | '81' | '82' | '83' | '84' | '85' | '86' | '87' | '88' | '89' |
  // '90' | '91' | '92' | '93' | '94' | '95' | '96' | '97' | '98' | '99' | '100'