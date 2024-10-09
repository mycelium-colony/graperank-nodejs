import * as types from "../types.ts"


export interface InterpretationProtocol {
  // input params for each instance
  readonly params : types.ProtocolParams
  // outputs JsonDoc formatted schema of allowed params for API documentation of each instance
  readonly schema? : string
  // default params for each kind to be interpreted
  readonly defaults : types.ProtocolParams
  // private storage for the data set returned by fetchData()
  readonly dataset : Set<any>
  // a callback to fetch data. called by InterpretationAPI
  fetchData(authors:types.userId[], filter? : object) : Promise<void>
  // a callback for interpreting data. called by InterpretationAPI
  interpret(params? : types.ProtocolParams) : Promise<types.RatingsList>
}

/******* DEMO *********

// DEMO implementaiton of a source interpretor
class MyDemoInterpreter<ParamsType extends types.ProtocolParams> implements InterpretationProtocol {
  params:ParamsType
  dataset : Set<any>

  constructor(
    readonly defaults : ParamsType,
    readonly interpret : (params : ParamsType) => Promise<types.RatingsList>,
  ){}

  async fetchData(authors:types.userId[]){
    this.dataset = new Set()
    // fetch data from network
    return ;
  }
}

// DEMO instantiation of a protocol processor
interface MyProtocolParams extends types.ProtocolParams {
  // add additional params here
}
const myprotocol = new MyDemoInterpreter<MyProtocolParams> (
  {   foo : true  },
  async (params?: MyProtocolParams) => {
    let R : types.RatingsList = []
    return R
  }
)

// DEMO export instances
export const mydemo = { myprotocol }

// DEMO use a protocol instance
const myUserList = []
const myParams : MyProtocolParams = {}
const myUserDataSet = await mydemo.myprotocol.fetchData(myUserList)
const myUserRatings = mydemo.myprotocol.interpret(myParams)

/*****************************************/