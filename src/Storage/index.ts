import { WorldviewData, GrapevineKeys, WorldviewKeys, DEFAULT_CONTEXT, StorageProcessor, StorageConfig, StorageSecrets, StorageFileList, Scorecards, ScorecardsEntry } from "../types"
import { s3Processor } from "./Processors/s3"


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
    if(typeof config.processor == 'string' && !StorageProcessors[config.processor] ) 
      throw('GrapeRank : Storage : ERROR invalid storage processor provided.')
    StorageApi.processor = typeof config.processor == 'string'
      ? new StorageProcessors[config.processor] 
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
      console.log('GrapeRank : Storage : processor does not have worldview.list() function')
      return undefined
    },

    // store the worldview settings event for calculating a grapevine
    async put(keys : Required<WorldviewKeys>, data : WorldviewData){ 
      // TODO verify the worldview signature
      // send to processor
      if(!!StorageApi.processor.worldview?.put)
        return await StorageApi.processor.worldview.put(keys, data)
      console.log('GrapeRank : Storage : processor does not have worldview.put() function')
      return false
    },

    // retrieve the worldview settings event for calculating a grapevine
    async get(keys: WorldviewKeys) {
      // set default context if none provided
      if(!keys.context) keys.context = DEFAULT_CONTEXT
      let worldview : WorldviewData | undefined
      // get Worldview data from processor
      if(!!StorageApi.processor.worldview?.get)
        worldview = await StorageApi.processor.worldview.get(keys)
      if(worldview){
        // console.log('GrapeRank : Storage : found worldview : ', worldview)
      }else{
        console.log('GrapeRank : Storage : no worldview exists OR processor does not have worldview.get() function')
      }
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

  scorecards = {

    // retrieve list of userid from processor
    async list(keys : GrapevineKeys, getall? : boolean){ 
      if(!!StorageApi.processor.scorecards?.list)
        return await StorageApi.processor.scorecards.list(keys, getall)
      console.log('GrapeRank : Storage : processor does not have scorecards.list() function')
      return undefined
    },
    // put grapevine scorecards
    async put(keys : Required<GrapevineKeys>, data : ScorecardsEntry[], overwrite? : boolean) {
      if(StorageApi.processor.scorecards?.put) 
        return await StorageApi.processor.scorecards.put(keys, data)
      console.log('GrapeRank : Storage : processor does not have scorecards.put() function')
      return undefined
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
        if(StorageApi.processor.scorecards.get) 
          return await StorageApi.processor.scorecards.get(keys)
      }
      console.log('GrapeRank : Storage : processor does not have scorecards.get() function')
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
 

const timestampregex = /\d{9,}/g
async function getCalculationTimestamps(type: 'grapevine' | 'scorecards', keys : Required<WorldviewKeys>, index=0) : Promise<number[]>{
  let timestamplist : number[] = []
  let files : StorageFileList | undefined
  if(StorageApi.controller[type]?.list){
    files = await StorageApi.controller[type].list(keys, true)
  }
  console.log('GrapeRank : Storage : getCalculationTimestamps() retrieved ',files.list.length,' files for ',type)
  if(files){
    files.list.forEach((filename)=>{
      timestamplist.push(filename as unknown as number)
      // let match = filename.match(timestampregex)
      // if(match && match[index]) timestamplist.push(match[index] as unknown as number)
    })
    // sort list in chronological order (newest first)
    timestamplist.sort((a,b) => b-a)
  }
  console.log('GrapeRank : Storage : getCalculationTimestamps() returned with ',timestamplist[0],' newest in list of ',timestamplist.length,' timestamps')
  return timestamplist
}




