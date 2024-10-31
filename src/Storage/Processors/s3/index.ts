import { StorageDataOperations, StorageFileList,  } from "../.."
import { GrapevineDataStorage, GrapevineKeys, ScorecardExport, ScorecardKeys, ApiKeysTypes, WorldviewKeys, WorldviewDataStorage, ApiTypeName, ScorecardsDataStorage } from "../../../types"
import { forEachBigArray } from "../../../utils"
import { s3 } from "./s3api"

export class s3Processor implements StorageDataOperations {

  worldview = {
    async list(keys : WorldviewKeys, getall? : boolean ) { 
      return await s3Processor.filelist('worldview', keys, getall)
    },

    // store the worldview settings event for calculating a grapevine
    async put(keys : WorldviewKeys, data : WorldviewDataStorage) {
      let success = false
      let s3key = s3Processor.key('worldview',keys)
      if(s3key) success = await s3.put(s3key,data, true)
      return success
    },

    // retrieve the worldview settings event for calculating a grapevine
    async get(keys : WorldviewKeys) {
      let data : WorldviewDataStorage | undefined
      let s3key = s3Processor.key('worldview',keys)
      if(s3key) data = await s3.get(s3key)
      return data 
    },

  }

  grapevine = {

    // get list of all grapevines for a single worldview
    async list(keys : GrapevineKeys, getall? : boolean){ 
      return await s3Processor.filelist('grapevine', keys, getall)
    },

    async get(keys : GrapevineKeys) {
      let data : GrapevineDataStorage | undefined
      let s3key = s3Processor.key('grapevine',keys)
      if(s3key) data = await s3.get(s3key)
      return data 
    },

    // store summary and metadata as new grapevine
    // store each score individually
    async put(keys : Required<GrapevineKeys>, data : GrapevineDataStorage) {
      let success = false
      // get s3key for grapevine data
      let grapevinekey = s3Processor.key('grapevine',keys)
      // put data
      if(grapevinekey) success = await s3.put(grapevinekey,data, true)
      // // REQUIRE `scores` to be present when storing grapevine data
      // if(!data.scores) return false
      // let scorekeys : ScorecardScoresKeys = {...keys}
      // // put ALL scores
      // const scorespromises : Promise<boolean>[] = []
      // data.scores.forEach( (scorebracket) => {
      //   scorekeys.scoreindex = scorebracket[0]
      //   scorebracket[1].forEach( (score)=>{
      //     let scoreS3key = s3Processor.key('scores',scorekeys)
      //     if(scoreS3key) scorespromises.push(s3.put(scoreS3key,data))
      //   })
      // })
      // // await for ALL scores to be put
      // await Promise.all(scorespromises)
      //   // put grapevine data ONLY if ALL scores were successfully put
      //   .then(async ()=>{
      //     // remove scores from grapevine data
      //     data.scores = undefined
      //     // get s3key for grapevine data
      //     let grapevinekey = s3Processor.key('grapevine',keys)
      //     // put data
      //     if(grapevinekey) success = await s3.put(grapevinekey,data)
      //   })
      //   .catch((reason)=>{
      //     // TODO delete put scores if put ALL was unsuccessfult
      //   })

      return success
    },
  }

  // scores = {
  //   // retrieve metadata about a calculated grapevine
  //   async get(keys : GrapevineKeys) {
  //     let data : GrapevineCalculation | undefined
  //     return data
  //   },
  //   // retrieve metadata about a range of calculated grapevines
  //   async getall(keys : GrapevineKeys, searchrange? , searchkey = 'timestamp') {
  //     let data : GrapevineCalculation[] | undefined
  //     return data
  //   },
  // }


  scorecards = {
    // get list of all userid for a single grapevine calculation
    async list(keys : GrapevineKeys, getall? : boolean){ 
      return await s3Processor.filelist('scorecards', keys, getall)
    },
    async get(keys : GrapevineKeys) {
      let data : ScorecardsDataStorage | undefined
      let s3key = s3Processor.key('scorecards',keys)
      if(s3key) data = await s3.get(s3key)
      return data 
    },
    // put all scorecards for a grapevine
    // TODO delete scorecards or try again if put returns false
    async put(keys : Required<GrapevineKeys>, data : ScorecardsDataStorage){
      let s3key = s3Processor.key('scorecards',keys)
      if(s3key) return await s3.put(s3key,data, true)
      return false
      // let scorecardspromises : Promise<boolean>[] = []
      // if(data){
      //   await forEachBigArray(data, (scorecardsentry) => {
      //     let scorecardkey = s3Processor.key('scorecards',{...keys, subject:scorecardsentry[0]})
      //     if(scorecardkey) scorecardspromises.push(s3.put(scorecardkey,scorecardsentry[1], true))
      //     })
      // }
      // let scorecardsput = await Promise.all(scorecardspromises)
      // return !scorecardsput.includes(false)
    }
  }



  // grapevine LIST = `grapevine/[observer]/[context]/`
  // grapevine GET/PUT/DELETE = `grapevine/[observer]/[context]/[timestamp]`

  // scorecards LIST =`scorecards/[observer]/[context]/`
  // scorecards GET =`scorecards/[observer]/[context]/[timestamp]/` = ScorecardData

  // Not implemented
  // worldview LIST = `worldview/[observer]`
  // worldview GET/PUT/DELETE = `worldview/[observer]/[context]`

  // Deprecated
  // scores LIST =`scores/[observer]/[context]/[timestamp]`
  // scores GET =`scores/[observer]/[context]/[timestamp]/[scoreindex]`


  static key(type : ApiTypeName, keys : Partial<ScorecardKeys> | string, forlist : boolean | string = false) : string | undefined{
    let keystrings : string[]
    let keylist : string[] = [type]
    let keylength : number = 0
    if(type == 'worldview') keylength = forlist ? 1 : 2
    if(type == 'grapevine') keylength = forlist ? 2 : 3
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

  static async filelist( type : ApiTypeName, keys : Partial<ScorecardKeys> | string , iterate? : boolean | StorageFileList) : Promise<StorageFileList | undefined>{
    console.log('GrapeRank : Storage : s3 processor : filelist called with : ', type, keys,iterate)
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
    console.log('GrapeRank : Storage : s3 processor : filelist returned with : ', filelist)
    return filelist
  }
  


}


// get s3 key from a ApiKeysTypes and a template array of strings
// template array is in the form of ['','','keypart','','']
// the number of entries is the length of the expected key
// and empy values in template will be replaced with values from ApiKeysTypes 
// in the following order [observer, context, timestamp, scoreindex, subject]
// function getS3Key(keys : ApiKeysTypes, template : string[], join = '/'){
//   let s3key : string | undefined
//   //  coerce properties of StorageKey to an array of strings in a specific order
//   let keystrings = [
//     keys.observer?.toString() || '',
//     keys.context?.toString() || '' ,
//     keys.timestamp?.toString() || '',
//     keys.scoreindex?.toString() || '',
//     keys.subject?.toString() || ''
//   ]
//   // iterate through template to fill empty keyparts
//   // replacing empty values with those from keystrings
//   let keystringindex = 0
//   template.forEach((templatevalue)=>{
//     let value = templatevalue || keystrings[keystringindex]
//     // return undefined if BOTH keys AND template have no vlaue for this keypart 
//     if(!value) return undefined
//     if(templatevalue) keystringindex ++
//     s3key = s3key ? s3key+join+value: value
//   })
//   return s3key
// }