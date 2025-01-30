import * as Calculator from "./Calculator";
import * as Interpreter from "./Interpreter";
import { StorageApi, StorageProcessors } from "./Storage";
import { ApiDataTypes, ApiOperation, ApiTypeName, EngineRequest, GrapevineData, GrapevineKeys, RatingsList, Scorecard, ScorecardKeys, ScorecardsRecord, userId, GraperankCalculation, WorldviewData, WorldviewKeys, StorageFileList, StorageConfig, GraperankSettings, ScorecardsEntries, ApiResponse, ApiRequest, ApiOperationName, ProtocolRequest, protocol } from "./types";
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

  async list(type? : ApiTypeName) : Promise<ApiResponse> {
    type = type || this.type
    if(!type) return undefined // TODO log error
    let response = this.newResponse('list')

    switch(type){
      case 'worldview' :
        response.list = await this.storage.worldview.list(this.request.keys as WorldviewKeys)
      case 'grapevine' :
        response.list = await  this.storage.grapevine.list(this.request.keys as GrapevineKeys)
      case 'scorecards' :
        response.list = await  this.storage.scorecards.list(this.request.keys as ScorecardKeys)
    }
    response.status = response.list ? true : false
    return response
  }

  async get(type? : ApiTypeName ) : Promise<ApiResponse> {
    type = type || this.type
    if(!type) return undefined
    // TODO generate response status && messages
    let response = this.newResponse('get')

    switch(type){ 

      case 'scorecards' :
        // get scorecards from storage
        if(!this.recalculate)
          response.scorecards = await this.storage.scorecards.get(this.request.keys as GrapevineKeys)

      case 'grapevine' :
        // AND/OR get grapevine from storage
        if((type == 'scorecards' && response.scorecards?.length) || !this.recalculate )
          response.grapevine = await this.storage.grapevine.get(this.request.keys as GrapevineKeys)

        // calculate (and store) grapevine and scorecards if NOT retrieved from storage
        if(!response.grapevine){
          let settings : GraperankSettings | undefined = this.request.data['graperank']
          response = { ...response, ...await this.generate(settings) }
        }

      case 'worldview' :
        // AND/OR get worldview from storage
        response.worldview = await this.storage.worldview.get(this.request.keys as WorldviewKeys)
    }
    // if(response.scorecards[DEBUGTARGET]) console.log('DEBUGTARGET : GrapeRank returned target scorecard : ', data[DEBUGTARGET])
    return response
  }

  async put(data : ApiDataTypes) : Promise<ApiResponse> {
    let response = this.newResponse('put')

    switch(this.type){
      // do nothing for calculated data
      case 'scorecards' :
      case 'grapevine' :
        break
      // TODO update worldview
      case 'worldview' :
        break
    }
    return response
  }

  // calculate and store a new grapevine
  private async generate(settings? : GraperankSettings, iteration? : number) : Promise<GraperankCalculation | undefined>{
    // validate keys
    let keys = settings?.keys
    if(!keys && this.request.keys.observer && this.request.keys.context) {
      keys = this.request.keys as Required<WorldviewKeys>
    }
    if(!keys) return undefined // TODO log error

    let worldview = await this.storage.worldview.get(keys)

    // get graperank settings from worldview
    if(!settings){
      // get graperank settings from worldview.graperank (default) 
      // OR from the worldview.calculated grapevine
      // OR from the latest calculated grapevine
      settings = worldview.graperank || (await this.storage.grapevine.get({...keys, timestamp : worldview.calculated})).graperank
    }
    if(!settings) return undefined // TODO log error
    
    let ratercards : ScorecardsEntries | undefined

    // TODO get ratercards from worldview input 
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

    // Interpret ratings
    const raters = this.getRaters(ratercards) || [keys.observer]
    console.log("GrapeRank : calling interpret with " ,raters.length, " authors ...")
    const interpeterresults = await Interpreter.interpret(raters, settings.interpreters)
    const ratings : RatingsList = interpeterresults.ratings
  
    // Calculate scorecards
    console.log("GrapeRank : calling calculate with "+ratings.length+" ratings... ")
    const calculation = Calculator.calculate(ratings, keys, settings)

    // write to storage
    if(calculation) {
      // Update worldview.calculated
      if(worldview.overwrite !== false) {
        worldview.calculated = calculation.keys.timestamp
        await this.storage.worldview.put(keys, worldview)
      }
      // set grapevine expires
      if(worldview.expiry) 
        calculation.grapevine.expires = calculation.keys.timestamp + worldview.expiry

      // set graperank interpreters used for this grapevine
      let interpreters : Map<protocol,ProtocolRequest> = new Map()
      interpeterresults.responses.forEach((response)=>{
        interpreters.set(response.request.protocol, response.request)
      })
      calculation.grapevine.graperank = {...calculation.grapevine.graperank, interpreters : [...interpreters.values()]}

      // send new grapevine to storage
      await this.storage.grapevine.put(calculation.keys, calculation.grapevine)
      /// send new scorecards to storage
      await this.storage.scorecards.put(calculation.keys, calculation.scorecards)

      if(worldview.archive === false) {
        // TODO delete old grapevines
      }

    }
    return {...calculation, worldview}
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

  private getRaters(scorecards : ScorecardsEntries = []) : userId[] | undefined {
    const raters : userId[] = []
    scorecards.forEach((entry) => {
      raters.push(entry[0])
    })
    return raters.length ? raters : undefined
  }

  private newResponse(op : ApiOperationName) : ApiResponse {
    return {
      op,
      keys : this.request.keys,
    }
  }
}