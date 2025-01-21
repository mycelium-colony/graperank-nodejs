import * as Calculator from "./Calculator";
import * as Interpreter from "./Interpreter";
import { StorageApi, StorageProcessors } from "./Storage";
import { ApiDataTypes, ApiOperation, ApiTypeName, EngineRequest, GrapevineData, GrapevineKeys, RatingsList, Scorecard, ScorecardKeys, ScorecardsRecord, userId, WorldviewCalculation, WorldviewData, WorldviewKeys, StorageFileList, StorageConfig } from "./types";
import { DEBUGTARGET } from "./utils";


// const storage = new StorageApi( new StorageProcessors.s3 )


// export class GrapeRank implements ApiProcessor {

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
  private storage : StorageApi 

  // observer: userId;
  // context: string;
  // input?: GrapevineKeys
  // interpreters: ProtocolRequest[];
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
    if(this.type && this.storage[this.type])
      return this.storage[this.type]
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
  //     return this.request.data as WorldviewData
  //   if(this.type === 'grapevine')
  //     return this.request.data as GrapevineData
  //   if(this.type === 'scorecards')
  //     return this.request.data as ScorecardsRecord
  // }

  constructor(
    private request : EngineRequest,
    storage : StorageConfig,
    private recalculate : boolean = false,
  ){
    console.log("GrapeRank : initializing with EngineRequest : ",this.request)
    this.storage = new StorageApi( storage )
    
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
      case 'worldview' :
        return this.storage.worldview.list(this.request.keys as WorldviewKeys)
      case 'grapevine' :
        return this.storage.grapevine.list(this.request.keys as GrapevineKeys)
      case 'scorecards' :
        return this.storage.scorecards.list(this.request.keys as ScorecardKeys)
    }
    return undefined
  }

  async get(type? : ApiTypeName ) : Promise<ApiDataTypes | undefined> {
    type = type || this.type
    if(!type) return undefined // TODO log error
    let data : ScorecardsRecord | GrapevineData | WorldviewData | undefined

    switch(type){ 
      // TODO handle for worldview and grapevine requests
      case 'worldview' :
        // GET worldview from storage
        data = await this.storage.worldview.get(this.request.keys as WorldviewKeys)
        break
      case 'grapevine' :
      case 'scorecards' :
        // GET grapevine from storage
        if(!this.request.keys.timestamp && !this.recalculate)
          data = await this.storage[type].get(this.request.keys as GrapevineKeys)
        // calculate (and store) grapevine if NOT retrieved from storage
        if(!data){ 
          const calculation = await this.generate()
          if(!calculation) return undefined // TODO log error
          data = calculation[type]
        }
        if(data[DEBUGTARGET]) console.log('DEBUGTARGET : GrapeRank returned target scorecard : ', data[DEBUGTARGET])
    }
    return data
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
  private async generate(keys? : Required<WorldviewKeys>, data? : WorldviewData, iteration? : number) : Promise<WorldviewCalculation | undefined>{
    // validate keys
    if(!keys && this.request.keys.observer && this.request.keys.context) {
      keys = this.request.keys as Required<WorldviewKeys>
    }
    if(!keys) return undefined // TODO log error

    // get worldview config
    if(!data){
      // get worldview data from Storage (or from preset ... as determined by Storage component)
      data = await this.storage.worldview.get(keys)

    }
    if(!data) return undefined // TODO log error
    
    let ratercards : ScorecardsRecord | undefined

    // TODO handle case for `input` worldview
    // get ratercards from worldview input 
    // either from storage OR by iteratively calling this funciton calculate() 
    // if(data.input){
    //   ratercards = await this.storage.scorecards.get(data.input)
    //   // if scorecards are not stored... get worldview and calculate new scorecards
    //   if(!ratercards ) {
    //     iteration = iteration ? iteration + 1 : 1
    //     let inputworldview = await this.storage.worldview.get(data.input)
    //     if(inputworldview) ratercards = await this.generate(data.input, inputworldview, iteration)
    //   }
    //   // if STILL no ratercards, 
    //   // TODO throw error
    //   if(!ratercards) return undefined
    // }

    // Calculate
    const raters = this.getRaters(ratercards) || [keys.observer]
    console.log("GrapeRank : calling interpret with " ,raters.length, " authors ...")
    const interpeterresults = await Interpreter.interpret(raters, data.interpreters)
    const ratings : RatingsList = interpeterresults.ratings
  
    // TODO what to do if new authors are "discovered" by interpreter?
    console.log("GrapeRank : calling calculate with "+ratings.length+" ratings... ")
    const calculation = Calculator.calculate(ratings, keys, data)
    if(calculation) {
      let grapevinekey = {...keys, timestamp:calculation.timestamp}
      // send new grapevine to storage
      await this.storage.grapevine.put(grapevinekey, calculation.grapevine)
      /// send new scorecards to storage
      await this.storage.scorecards.put(grapevinekey, calculation.scorecards)
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

  private getRaters(scorecards : ScorecardsRecord = {}) : userId[] | undefined {
    const raters : userId[] = []
    for(let userid in scorecards) {
      raters.push(userid)
    }
    return raters.length ? raters : undefined
  }
}