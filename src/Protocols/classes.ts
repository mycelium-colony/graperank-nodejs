import * as types from "../types.ts"


export interface Interpreter {
  // url-safe name of the source : "nostr"
  readonly source : types.slug;
  // url-safe name of the protocol : "follows"
  readonly protocol : types.slug
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
class DemoInterpreter<ParamsType extends types.ProtocolParams> implements Interpreter {
  params:ParamsType
  readonly source : 'demo'

  constructor(
    readonly protocol : types.slug,
    readonly defaults : ParamsType,
    readonly interpret : (data:Set<any>,  params : ParamsType) => types.RatingsList,
  ){}

  async fetchData(authors:types.userId[]){
    let data = new Set()
    // fetch data from network
    return ;
  }
}

// DEMO instantiation of a protocol processor
interface MyProtocolParams extends types.ProtocolParams {
  // add additional params here
}
const DemoMyProtocol = new DemoInterpreter<MyProtocolParams> (
  "MyProtocol",
  {   foo : true  },
  (data: Set<any>, params?: MyProtocolParams) : types.RatingsList => {
    let R : types.RatingsList = []
    return R
  }
)

// DEMO use of a protocol processor
const myUserList = []
const myParams : MyProtocolParams = {}
const myUserDataSet = await DemoMyProtocol.fetchData(myUserList)
const myUserRatings = DemoMyProtocol.interpret(myUserDataSet,myParams)

/*****************************************/