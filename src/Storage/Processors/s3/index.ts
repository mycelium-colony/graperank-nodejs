import { GrapevineKeys, ScorecardKeys, WorldviewKeys, WorldviewData, StorageType, StorageProcessor, StorageFileList, s3secrets, Scorecards, ScorecardsEntry } from "../../../types"
import { forEachBigArray } from "../../../utils"
import { s3 } from "./s3api"

export class s3Processor implements StorageProcessor {

  init(secrets : s3secrets){
    s3.init(secrets)
  }

  worldview = {
    async list(keys : WorldviewKeys, getall? : boolean ) { 
      return await s3Processor.filelist('worldview', keys, getall)
    },

    // store the worldview settings event for calculating a grapevine
    async put(keys : WorldviewKeys, data : WorldviewData) {
      let success = false
      let s3key = s3Processor.key('worldview',keys)
      if(s3key) success = await s3.put(s3key,data, true)
      return success
    },

    // retrieve the worldview settings event for calculating a grapevine
    async get(keys : WorldviewKeys) {
      let data : WorldviewData | undefined
      let s3key = s3Processor.key('worldview',keys)
      if(s3key) data = await s3.get(s3key)
      return data 
    },

  }

  scorecards = {
    // get list of all userid for a single grapevine calculation
    async list(keys : GrapevineKeys, getall? : boolean){ 
      return await s3Processor.filelist('scorecards', keys, getall)
    },
    async get(keys : GrapevineKeys) {
      let data : ScorecardsEntry[] | undefined
      let s3key = s3Processor.key('scorecards',keys)
      if(s3key) data = await s3.get(s3key)
      return data 
    },
    // put all scorecards for a grapevine
    // TODO delete scorecards or try again if put returns false
    async put(keys : Required<GrapevineKeys>, data : ScorecardsEntry[]){
      let s3key = s3Processor.key('scorecards',keys)
      if(s3key) return await s3.put(s3key,data, true)
      return false
    }
  }



  static key(type : StorageType, keys : Partial<ScorecardKeys> | string, forlist : boolean | string = false) : string | undefined{
    let keystrings : string[]
    let keylist : string[] = [type]
    let keylength : number = 0
    if(type == 'worldview') keylength = forlist ? 1 : 2
    if(type == 'scorecards') keylength = forlist ? 2 : 3

    // ERROR invalid type passed
    if(!keylength) return undefined

    // if passed a string as keys then simply replace the last index and return the string
    if(typeof keys == 'string'){
      keystrings = keys.split('/') 
      if(keystrings[0] == type && keystrings.length == keylength){
        if(typeof forlist == 'string') keystrings[keystrings.length -1] = forlist
      }
      return keystrings.join('/') 
    }
    // coerce keys to an array of strings in a specific order
    if(typeof keys == 'object'){
      keystrings = [
        keys.observer?.toString() || '',
        keys.context?.toString() || '' ,
        keys.timestamp?.toString() || '',
        keys.subject?.toString() || '']
      // for the number of iterations specified in keylength
      // append strings from keystrings[] to keylist[]
      while(keylength >= keylist.length){
        let keystring = keystrings[keylist.length -1]
        if(keystring){ keylist.push(keystring) }else{ return undefined }
      }
      // join and return a string
      return keylist.join('/')
    }
}

  static async filelist( type : StorageType, keys : Partial<ScorecardKeys> | string , iterate? : boolean | StorageFileList) : Promise<StorageFileList | undefined>{
    console.log('GrapeRank : Storage : s3 processor : filelist called for : ', type)
    let s3key = typeof keys == 'string' ? keys : s3Processor.key(type, keys, true)
    let filelist : StorageFileList | undefined
    // get the filelist from s3
    if(s3key) filelist = await s3.list(s3key) // || {list : []}
    // merge previous results
    if(typeof iterate == 'object' && !!iterate?.list){
      filelist?.list.push(...iterate.list)
    }
    // determine if we should iterate again or not
    if(iterate && filelist?.next){ 
      // s3key = s3Processor.key(type, keys, filelist.next)
      // if(s3key) return s3Processor.filelist(type, s3key, filelist)
      console.log('GrapeRank : Storage : s3 processor : filelist iteration canceled')
    }
    // else return the results
    console.log('GrapeRank : Storage : s3 processor : filelist returned with : ', filelist.list.length, " files")
    return filelist
  }
  


}
