import * as Calculator from "./Calculator";
import * as Interpreter from "./Interpreter";
import { StorageApi, StorageFileList, StorageProcessor } from "./Storage";
import { ApiDataTypes, ApiOperation, ApiRequest, ApiTypeName, ApiTypeOperation, CalculatorParams, EngineRequest, GrapevineDataStorage, GrapevineKeys, InterpreterRequest, RatingsList, Scorecard, ScorecardKeys, ScorecardsDataStorage, timestamp, userId, WorldviewCalcululation, WorldviewDataStorage, WorldviewKeys, WorldviewSettings } from "./types";


// const storage = new StorageApi( new StorageProcessor.s3 )


// export class GrapeRank implements ApiTypeOperation {

//   constructor(
//     private request : EngineRequest,
//     private resetcache : boolean = false
//   ){}

//   worldview = {
//     list : storage.worldview.list,
//     get : storage.worldview.get,
//     put : storage.worldview.put,
//   }
  
//   scorecards = {
//     get : resetcache ? storage.scorecards.get,
//     put : storage.scorecards.put,
//   }
// }


export class GrapeRank implements ApiOperation {
  private scorecards? : Scorecard[]
  static storage = new StorageApi( new StorageProcessor.s3 )

  // observer: userId;
  // context: string;
  // input?: GrapevineKeys
  // interpreters: InterpreterRequest[];
  // params: CalculatorParams;
  // dev : DevParams;
  // FIXME implement these properties
  // grapevine: true | GrapevineFilter;
  // subjects: userId;

  get type() { 
    let type : ApiTypeName | undefined
    if(this.request.keys?.observer && this.request.type == 'worldview') 
      type = this.request.type
    if(this.request.keys?.context && this.request.type == 'worldview' || this.request.type == 'grapevine') 
      type = this.request.type
    if(this.request.keys?.timestamp && this.request.type == 'grapevine' || this.request.type == 'scorecards') 
      type = this.request.type
    if(this.request.keys?.subject && this.request.type == 'scorecards') 
      type = this.request.type
    return type
  }

  get storagetype(){
    if(this.type && GrapeRank.storage[this.type])
      return GrapeRank.storage[this.type]
    return undefined
  }

  // get keys(){
  //   if(!this.request.keys) return undefined
  //   if(this.type === 'worldview')
  //     return this.request.keys as WorldviewKeys
  //   if(this.type === 'grapevine')
  //     return this.request.keys as GrapevineKeys
  //   if(this.type === 'scorecards')
  //     return this.request.keys as ScorecardKeys
  // }

  // get data(){
  //   if(!this.request.data) return undefined
  //   if(this.type === 'worldview')
  //     return this.request.data as WorldviewDataStorage
  //   if(this.type === 'grapevine')
  //     return this.request.data as GrapevineDataStorage
  //   if(this.type === 'scorecards')
  //     return this.request.data as ScorecardsDataStorage
  // }

  constructor(
    private request : EngineRequest,
    private recalculate : boolean = false
  ){
    console.log("GrapeRank : initializing with EngineRequest : ",this.request)
    // if(!request.observer || request.observer === 'undefined') throw("GrapeRank : ERROR initializing : mssing observer")
    // this.observer = request.observer
    // if(!request.context || request.context === 'undefined') throw("GrapeRank : ERROR initializing : mssing context")
    // this.context = request.context
    // this.input = request.input || undefined
    // this.interpreters = request.interpreters || []
    // this.params = {...GrapeRank.params, ...request.params}
    // this.dev = request.dev || {}
  }

  async list(type? : ApiTypeName) : Promise<StorageFileList | undefined> {
    type = type || this.type
    if(!type) return undefined // TODO log error

    switch(type){
      // case 'worldview' :
      //   return GrapeRank.storage.worldview.list(this.request.keys as WorldviewKeys)
      // case 'grapevine' :
      //   return GrapeRank.storage.grapevine.list(this.request.keys as GrapevineKeys)
      case 'scorecards' :
        return GrapeRank.storage.scorecards.list(this.request.keys as ScorecardKeys)
    }
    return undefined
  }

  async get(type? : ApiTypeName ) : Promise<ApiDataTypes | undefined> {
    type = type || this.type
    if(!type) return undefined // TODO log error

    switch(type){ 
      // TODO handle for worldview and grapevine requests
      // case 'worldview' :
      //   // GET worldview from storage
      //   let worldview = await GrapeRank.storage.worldview.get(this.request.keys as WorldviewKeys)
      //   if(worldview) return [worldview]

      case 'grapevine' :
      case 'scorecards' :
        // GET grapevine from storage
        let data : ScorecardsDataStorage | GrapevineDataStorage | undefined
        if(!this.request.keys.timestamp && !this.recalculate)
          data = await GrapeRank.storage[type].get(this.request.keys as GrapevineKeys)
        // calculate (and store) grapevine if NOT retrieved from storage
        if(!data){ 
          const calculation = await this.generate()
          if(!calculation) return undefined // TODO log error
          data = calculation[type]
        }
        return data
    }
  }

  async put(){
    switch(this.type){
      // case 'worldview' :
      //   break
      // case 'grapevine' :
      //   break
      // case 'scorecards' :
      //   break
    }
  }

  // calculate and store a new grapevine
  private async generate(keys? : Required<WorldviewKeys>, data? : WorldviewDataStorage, iteration? : number) : Promise<WorldviewCalcululation | undefined>{
    // validate keys
    if(!keys && this.request.keys.observer && this.request.keys.context) {
      keys = this.request.keys as Required<WorldviewKeys>
    }
    if(!keys) return undefined // TODO log error

    // get worldview config
    if(!data){
      // get demo worldview regardless of keys passed
      data = worldviewpresets[DEMO_CONTEXT]
      // TODO get worldview from storage
      // data = await GrapeRank.storage.worldview.get(keys)

    }
    if(!data) return undefined // TODO log error
    
    let ratercards : ScorecardsDataStorage | undefined

    // TODO handle case for `input` worldview
    // get ratercards from worldview input 
    // either from storage OR by iteratively calling this funciton calculate() 
    // if(data.input){
    //   ratercards = await GrapeRank.storage.scorecards.get(data.input)
    //   // if scorecards are not stored... get worldview and calculate new scorecards
    //   if(!ratercards ) {
    //     iteration = iteration ? iteration + 1 : 1
    //     let inputworldview = await GrapeRank.storage.worldview.get(data.input)
    //     if(inputworldview) ratercards = await this.generate(data.input, inputworldview, iteration)
    //   }
    //   // if STILL no ratercards, 
    //   // TODO throw error
    //   if(!ratercards) return undefined
    // }

    // Calculate
    const raters = this.getRaters(ratercards) || [keys.observer]
    console.log("GrapeRank : calling interpret with " ,raters.length, " authors ...")
    const ratings : RatingsList = await Interpreter.interpret(raters, data.interpreters)
  
    // TODO what to do if new authors are "discovered" by interpreter?
    console.log("GrapeRank : calling calculate with "+ratings.length+" ratings... ")
    const calculation = Calculator.calculate(ratings, keys, data)
    if(calculation) {
      let grapevinekey = {...keys, timestamp:calculation.timestamp}
      // send new grapevine to storage
      await GrapeRank.storage.grapevine.put(grapevinekey, calculation.grapevine)
      /// send new scorecards to storage
      await GrapeRank.storage.scorecards.put(grapevinekey, calculation.scorecards)
    }
    return calculation
  }

  // export() : Scorecard[] {
  //   let scorecards : Scorecard[] = []
  //   if(this.scorecards){
  //     for(let c in this.scorecards){
  //       let exportcard : Scorecard = {
  //         subject : this.scorecards[c].subject,
  //         score : this.scorecards[c].score,
  //         confidence : this.scorecards[c].confidence
  //       }
  //       scorecards.push(exportcard)
  //     }
  //   }
  //   return scorecards
  // }

  // private get scores() : Scorecard[] {
  //   let scores = this.request.input || []
  // }

  // private async getInputScorecards() : Promise<Scorecard[]> {
  //   if(!this.input) return []
  //   Storage.
  // }

  private getRaters(scorecards : ScorecardsDataStorage = []) : userId[] | undefined {
    const raters : userId[] = []
    scorecards.forEach((entry)=>{
      raters.push(entry[0])
    })
    return raters.length ? raters : undefined
  }
}


export const DEMO_CONTEXT = "grapevine-web-of-trust-demo"
export const DEFAULT_CONTEXT= "grapevine-web-of-trust"
const worldviewpresets : Record<string,WorldviewSettings> = {

  [DEMO_CONTEXT] : {
    interpreters : [{
      protocol : "nostr-follows",
      params : {iterate : 3 }
    }],
    calculator : undefined,
    input : undefined
  },

  [DEFAULT_CONTEXT] : {
    interpreters : [
      {
        protocol : "nostr-follows",
        params : {iterate : 3 }
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