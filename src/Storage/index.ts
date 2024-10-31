import { GrapevineDataStorage, WorldviewDataStorage, GrapevineKeys, WorldviewKeys, ScorecardKeys, ApiKeysTypes, ScorecardData, ApiOperation, ApiTypeOperation, ScorecardsDataStorage, ApiTypeName } from "../types"
import { s3Processor } from "./Processors/s3"


// // STORAGE DEMO
// const s3storage = new Storage(new Processors.s3)
// // get a specific worldview  for this observer 
// // (with metadata for calculated grapevines)
// s3storage.worldview.get({ observer:'mypubkey', context:'myworldview' })
// // query all worldviews for this observer
// s3storage.worldview.query((w)=> w.observer ==  'mypubkey')
// // get latest (grapevine) scorecards calculated for a worldview
// s3storage.scorecards.get({ observer:'mypubkey', context:'myworldview' })
// // query all scorecards calculated for an observer and a subject
// s3storage.scorecards.query((s) => s.observer == 'mypubkey' && s.subject == 'myfriendspubkey')

export namespace StorageProcessor {
  export const s3 = s3Processor
}

/**
 * Storage and retrieval of calculator data
 */
export class StorageApi implements Required<StorageDataOperations> {
  static processor : StorageDataOperations
  static controller : StorageDataOperations
  
  constructor( storageprocessor : StorageDataOperations ){
    if(storageprocessor == this) throw('ERROR cannot instantiate Storage with `this` as api')
    StorageApi.processor = storageprocessor
    StorageApi.controller = this
  }

  worldview = {

    // retrieve list from processor
    async list(keys : WorldviewKeys, getall? : boolean){ 
      if(!!StorageApi.processor.worldview?.list)
        return await StorageApi.processor.worldview.list(keys, getall)
      return undefined
    },

    // store the worldview settings event for calculating a grapevine
    async put(keys : Required<WorldviewKeys>, data : WorldviewDataStorage){ 
      // TODO verify the worldview signature
      // remove calculated from worldview data
      data.calculated = undefined
      // send to processor
      if(!!StorageApi.processor.worldview && StorageApi.processor.worldview.put)
        return await StorageApi.processor.worldview.put(keys, data)
      return false
    },

    // retrieve the worldview settings event for calculating a grapevine
    async get(keys : WorldviewKeys) {
      if(!keys.context) return undefined
      let worldview : WorldviewDataStorage | undefined
      // get Worldview data from processor
      if(StorageApi.processor.worldview) 
        worldview = await StorageApi.processor.worldview.get(keys)
      // get list of calculated Grapevines from processor
      if(worldview) await getWorldviewCalculated(keys as Required<WorldviewKeys>, worldview)
      return worldview
    },

    // retrieve a collection of worldviews
    // async query (match : (data: Partial<WorldviewDataStorage>) => boolean | undefined) : Promise<WorldviewDataStorage[] | undefined> {
    //   let matches : WorldviewDataStorage[] | undefined
    //   // proccess queries here and call proccessor.worldview.get() for each result?
    //   if(StorageApi.processor.worldview?.query) matches = await StorageApi.processor.worldview.query(match)
    //   if(matches) matches.forEach(async (worldview)=>{  await getWorldviewCalculated(worldview) })
    //   return matches    
    // },
  }

  grapevine = {
    // retrieve list from processor
    async list(keys : GrapevineKeys, getall? : boolean){ 
      if(!!StorageApi.processor.grapevine?.list)
        return await StorageApi.processor.grapevine.list(keys, getall)
      return undefined
    },

    // store the metadata and summary of a grapevine calculation 
    async put(keys : Required<GrapevineKeys>, data : GrapevineDataStorage) {
      // TODO validate worldview signature before writing results
      // TODO require `timestamp` and deny overwriting to the same timestamp
      // send to processor
      if(!!StorageApi.processor.grapevine && StorageApi.processor.grapevine.put)
        return await StorageApi.processor.grapevine.put(keys, data)
      return false
    },

    // retrieve GrapevineCalculation and GrapevineScores (not scorecards) as Grapevine
    async get(keys : GrapevineKeys) {
      // get latest timestamp from filelist if none provided
      if(!keys.timestamp && StorageApi.processor.grapevine) {
        let timestamps = await getCalculationTimestamps('grapevine', keys)
        keys.timestamp = timestamps[0] || undefined
      }
      if(keys.timestamp){
        // get grapevine from processor
        console.log('GrapeRank : StorageApi : calling processor.scorecards.get() with : ',keys)
        if(keys.timestamp && StorageApi.processor.grapevine) 
          return await StorageApi.processor.grapevine.get(keys)
      }
      return undefined
    },
  }

  // scores = {

  //   // retrieve list from processor
  //   async list(keys : Partial<ApiKeysTypes>, getall? : boolean){ 
  //     if(!!StorageApi.processor.scores?.list)
  //       return StorageApi.processor.scores.list(keys, getall)
  //     return undefined
  //   },
    
  //   // retrieve scores from a grapevine calculation
  //   async get(keys : ApiKeysTypes) {
  //     if(!keys.observer) return undefined
  //     if(!keys.context) return undefined
  //     // get latest timestamp from filelist if none provided
  //     if(!keys.timestamp && StorageApi.processor.grapevine) {
  //       keys.timestamp = await getTimestampList(keys as Required<WorldviewKeys>)[0]
  //     }
  //     // get scores from processor ONLY if all keys are provided
  //     if(keys.timestamp && StorageApi.processor.scores)
  //       return StorageApi.processor.scores.get(keys)
  //     return undefined
  //   },

  // }

  scorecards = {

    // retrieve list of userid from processor
    async list(keys : GrapevineKeys, getall? : boolean){ 
      if(!!StorageApi.processor.scorecards?.list)
        return await StorageApi.processor.scorecards.list(keys, getall)
      return undefined
    },
    // put grapevine scorecards
    async put(keys : Required<GrapevineKeys>, data : ScorecardsDataStorage, overwrite? : boolean) {
      if(StorageApi.processor.scorecards?.put) 
        return await StorageApi.processor.scorecards.put(keys, data)
      return false
    },

    // get grapevine scorecards
    async get(keys : GrapevineKeys) {
      // get latest grapevine timestamp if none provided
      if(!keys.timestamp) {
        let timestamps = await getCalculationTimestamps('scorecards', keys as Required<WorldviewKeys>)
        keys.timestamp = timestamps[0] || undefined
      }
      if(keys.timestamp){
        // get scorecard data from processor
        console.log('GrapeRank : StorageApi : calling processor.scorecards.get() with : ',keys)
        if(StorageApi.processor.scorecards) 
          return await StorageApi.processor.scorecards.get(keys)
      }
      return undefined
    },

    // // FIXME scorecard query SHOULD return full scorecard (including keys and data)
    // // IF query results MAY be from different calculation sets
    // // retrieve a collection of ScorecardExport based on a callback 
    // async query (match : (data: Partial<ScorecardExport>) => boolean | undefined) : Promise<ScorecardExport[] | undefined> {
    //   let matches : ScorecardExport[] | undefined
    //   // TODO maybe proccess queries here and call proccessor.scorecard.get() for each result?
    //   if(StorageApi.processor.scorecards?.query) matches = await StorageApi.processor.scorecards.query(match)
    //   return matches    
    // },

  }

 }
 

//  async function apiFetch(request : Request){
//   return await fetch(request)
//   .then(async (response)=>{
//     return JSON.parse( await response.json() )
//   }).catch((reason)=>{
//     throw(new Error(reason))
//   })
//  }

export type StorageFileList = { list :string[], next?:string } 

export interface StorageOperations<KeysType , DataType> extends ApiOperation  {
  list? : (keys : KeysType, getall? : boolean) => Promise< StorageFileList | undefined>
  put? : (keys: Required<KeysType>, data: DataType, overwrite? : boolean) => Promise<boolean>
  get : (keys: KeysType) => Promise<DataType | undefined>
  query? : (match : (data: Partial<DataType>) => boolean | undefined) => Promise<DataType[] | undefined>
  delete? : (keys: Partial<KeysType>, deleteall? : boolean) => Promise<boolean>
} 

export interface StorageDataOperations extends ApiTypeOperation {
// store and retrieve worldview settings as user signed events 
// for calculating a grapevine
worldview? : StorageOperations<WorldviewKeys, WorldviewDataStorage>,

// store and retrieve results and metadata from grapevine calculations
// unsigned grapevine data is ONLY stored after verifying worldview event signatures 
grapevine? : StorageOperations<GrapevineKeys, GrapevineDataStorage>,

// retrieve scores associated with a grapevine. PUT is not permitted.
// scores? : StorageType<ApiKeysTypes, GrapevineScoresStorage>,

// query to return FULL scorecards from ANY grapevine
scorecards? : StorageOperations<GrapevineKeys, ScorecardsDataStorage>
}


async function getWorldviewCalculated(worldviewkeys : Required<WorldviewKeys>, worldview : WorldviewDataStorage) : Promise<void> {
  // get a list of timestamp identifyers for every calculated grapevine
  let timestamps = await getCalculationTimestamps('grapevine', worldviewkeys)
  if(StorageApi.controller.grapevine?.get) {
    timestamps.forEach(async (timestamp)=>{
      let grapevinedata : GrapevineDataStorage | undefined
      // get data for each Grapevine from processor
      grapevinedata = await StorageApi.controller.grapevine?.get({...worldviewkeys,timestamp})
      // append timestamp and grapevine data to worldview.calculated
      if(grapevinedata) worldview.calculated?.push([timestamp, grapevinedata])
    })
  }
  return
}

const timestampregex = /\d{9,}/g
async function getCalculationTimestamps(type: 'grapevine' | 'scorecards', keys : Required<WorldviewKeys>, index=0) : Promise<number[]>{
  let timestamplist : number[] = []
  let filenamelist : string[] | undefined
  if(StorageApi.processor[type]?.list){
    filenamelist = await StorageApi.processor[type].list(keys, true).then((files)=> files?.list)
  }
  if(filenamelist){
    filenamelist.forEach((filename)=>{
      timestamplist.push(filename as unknown as number)
      // let match = filename.match(timestampregex)
      // if(match && match[index]) timestamplist.push(match[index] as unknown as number)
    })
    // sort list in chronological order (newest first)
    timestamplist.sort((a,b) => b-a)
  }
  console.log('GrapeRank : Storage : getCalculationTimestamps() returned with : ',timestamplist)
  return timestamplist
}

// const scoreindexregex = /\d{1,}/g
// async function getScoreindexList(keys : Required<ScorecardScoresKeys>, index=0) : Promise<number[]>{
//   let scoreindexlist : number[] = []
//   let filenamelist : string[] | undefined
//   if(StorageApi.processor.scores?.list){
//     filenamelist = await StorageApi.processor.scores.list(keys, true).then((files)=> files?.list)
//   }
//   if(filenamelist){
//     filenamelist.forEach((filename)=>{
//       let match = filename.match(scoreindexregex)
//       if(match && match[index]) scoreindexlist.push(match[index] as unknown as number)
//     })
//     // sort list in descending order (top scores first)
//     scoreindexlist.sort((a,b) => b-a)
//   }
//   return scoreindexlist
// }