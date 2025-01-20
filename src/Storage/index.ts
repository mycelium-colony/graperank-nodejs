import { GrapevineData, WorldviewData, GrapevineKeys, WorldviewKeys, ScorecardKeys, ApiKeysTypes, ScorecardData, ApiOperation, ApiProcessor, ScorecardsRecord, ApiTypeName, WorldviewSettings, DEMO_CONTEXT, DEFAULT_CONTEXT, Grapevine, StorageProcessor, StorageConfig, StorageSecrets } from "../types"
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

export namespace StorageProcessors {
  export const s3 = s3Processor
}

/**
 * Storage and retrieval of calculator data
 */
export class StorageApi implements Required<StorageProcessor> {
  static processor : StorageProcessor
  static controller : StorageProcessor
  
  constructor( config : StorageConfig ){
    if(typeof config.processor == 'string' && !StorageProcessors[config.processor]) 
      throw('ERROR invalid storage processor provided.')
    StorageApi.processor = typeof config.processor == 'string'
      ? StorageProcessors[config.processor] 
      : config.processor
    StorageApi.controller = this
    this.init(config.secrets)
  }

  init(secrets : StorageSecrets){
    if(StorageApi.processor.init)   StorageApi.processor.init(secrets)
  }

  worldview = {

    // retrieve list from processor
    async list(keys : WorldviewKeys, getall? : boolean){ 
      if(!!StorageApi.processor.worldview?.list)
        return await StorageApi.processor.worldview.list(keys, getall)
      return undefined
    },

    // store the worldview settings event for calculating a grapevine
    async put(keys : Required<WorldviewKeys>, data : WorldviewData){ 
      // TODO verify the worldview signature
      // remove calculated from worldview data
      data.grapevines = undefined
      // send to processor
      if(!!StorageApi.processor.worldview && StorageApi.processor.worldview.put)
        return await StorageApi.processor.worldview.put(keys, data)
      return false
    },

    // retrieve the worldview settings event for calculating a grapevine
    async get(keys: WorldviewKeys) {
      // set default context if none provided
      if(!keys.context) keys.context = DEFAULT_CONTEXT
      let worldview : WorldviewData | undefined
      // get worldview data from preset
      if(WORLDVIEW_PRESETS[keys.context]) 
        worldview = WORLDVIEW_PRESETS[keys.context]
      // get Worldview data from processor
      if(!worldview && StorageApi.processor.worldview) 
        worldview = await StorageApi.processor.worldview.get(keys)
      // get list of calculated Grapevines from processor
      if(worldview) worldview.grapevines = await getWorldviewGrapevines(keys as Required<WorldviewKeys>)
      return worldview
    },

    // retrieve a collection of worldviews
    // async query (match : (data: Partial<WorldviewData>) => boolean | undefined) : Promise<WorldviewData[] | undefined> {
    //   let matches : WorldviewData[] | undefined
    //   // proccess queries here and call proccessor.worldview.get() for each result?
    //   if(StorageApi.processor.worldview?.query) matches = await StorageApi.processor.worldview.query(match)
    //   if(matches) matches.forEach(async (worldview)=>{  await getWorldviewGrapevines(worldview) })
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
    async put(keys : Required<GrapevineKeys>, data : GrapevineData) {
      // TODO validate worldview signature before writing results
      // TODO require `timestamp` and deny overwriting to the same timestamp
      // send to processor
      if(!!StorageApi.processor.grapevine && StorageApi.processor.grapevine.put)
        return await StorageApi.processor.grapevine.put(keys, data)
      return false
    },

    // retrieve Grapevine summary and metadata as GrapevineData
    async get(keys : GrapevineKeys) {
      // get latest timestamp from filelist if none provided
      if(!keys.timestamp && StorageApi.processor.grapevine) {
        let timestamps = await getCalculationTimestamps('grapevine', keys)
        keys.timestamp = timestamps[0] || undefined
      }
      if(keys.timestamp){
        // get grapevine from processor
        console.log('GrapeRank : StorageApi : calling processor.grapevine.get() with : ',keys)
        if(StorageApi.processor.grapevine) 
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
    async put(keys : Required<GrapevineKeys>, data : ScorecardsRecord, overwrite? : boolean) {
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

async function getWorldviewGrapevines(worldviewkeys : Required<WorldviewKeys>, limit = 0) : Promise<Grapevine[]> {
  let grapevines : Grapevine[] = []
  if(StorageApi.controller.grapevine?.get) {
    // get a list of timestamp identifiers for every calculated grapevine
    let timestamps = await getCalculationTimestamps('grapevine', worldviewkeys)
    // get individual grapevines up to limit
    // TODO apply limit when retrieving timestamps from Storage.list()
    for(let i in timestamps){
      if(limit && i as unknown as number > limit) break
      let timestamp = timestamps[i.toString()]
      let grapevinedata : GrapevineData | undefined
      // get data for each Grapevine from processor
      if(timestamp) grapevinedata = await StorageApi.controller.grapevine.get({...worldviewkeys,timestamp})
      // append grapevine keys and data to worldview.grapevines
      if(grapevinedata) grapevines.push({...worldviewkeys, timestamp, ...grapevinedata})
    }
  }
  return grapevines
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



const WORLDVIEW_PRESETS : Record<string,WorldviewSettings> = {

  [DEMO_CONTEXT] : {
    interpreters : [
      {
        protocol : "nostr-follows",
        iterate : 6
      },
      {
        protocol : "nostr-mutes",
      },
      {
        protocol : "nostr-reports",
      }
    ],
    calculator : undefined,
    input : undefined
  },

  [DEFAULT_CONTEXT] : {
    interpreters : [
      {
        protocol : "nostr-follows",
        iterate : 6
      },
      {
        protocol : "nostr-mutes",
      },
      {
        protocol : "nostr-reports",
      }
    ],
    calculator : undefined,
    input : undefined
  }

}