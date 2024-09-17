import * as types from "../types.ts"

// Export ALL modules implementing InterpretorClass from here
export * from "./Nostr/Interpretor.ts"

export interface InterpretorClass {
  // 
  readonly params:types.InterpretorParams
  // default preferences fort each kind to be interpreted
  readonly prefs : { [n:types.kindId] : types.ParamsObject }
  // a callback to fetch data. called by InterpretationAPI
  fetchData() : Promise<types.InterpretableData>
  // different callbacks for each kind to be interpreted. called by InterpretationAPI
  readonly interpretRatings : {
    [n:types.kindId] : (data : any[], author? : types.userId, prefs? : types.ParamsObject) => types.R
  }
}


// DEMO implementaiton
class DemoInterpretor implements InterpretorClass {

  readonly prefs = {
    demokind : { 
      foo : true 
    }
  }

  constructor(
    readonly params:types.InterpretorParams
  ){}

  async fetchData(){
    let data : types.InterpretableData = {}
    // fetch data from network
    return data;
  }

  readonly interpretRatings = {
    demokind : (data: object[], author? : types.userId, prefs?: types.ParamsObject) : types.R => {
      // merge passed in prefs with default prefs
      prefs = {...this.prefs.demokind, ...prefs}
      let R : types.R = {}
      // interpret ratings from data, using prefs to assign Ratings
      return R
    }
  }

}


