import { ProtocolParams, ProtocolRequest, RatingsMap, userId } from "../types"


export interface InterpretationProtocol<ParamsType extends ProtocolParams> {
  // outputs JsonDoc formatted schema of allowed params for API documentation of each instance
  readonly schema? : string
  // the request object as set by interpret API
  request : ProtocolRequest
  // params for interpretation (should return merged default and requested params)
  params : ParamsType
  // an array of ALL data sets fetched by this protocol instance, 
  // each call to fetchData() produces ONE set in `fetched` array
  // whereby any NEW protocol iteration uses NEW raters from the previous iteration,
  // every protocol iteration can represent ONE 'degree of separation' from the original raters list
  readonly fetched : Set<any>[]
  // a map of ALL UNIQUE ratings indexed by rater and ratee
  // each call to interperet() method adds additional records to this map 
  readonly interpreted : RatingsMap 
  // a callback to fetch data. called by Interpreter API, adds a new set to fetched 
  // returns `fetchedIndex`, the index (dos) of the fetchedSet which was just added
  fetchData(this : InterpretationProtocol<ParamsType>, authors? : Set<userId>) : Promise<number>
  // a callback for interpreting data. called by Interpreter API
  // use `fetchedIndex` to specify a set of fetched data to interpret
  // returns the interpreted data ONLY from specified set of fetched (not the entire set of interpteted)
  interpret(this : InterpretationProtocol<ParamsType>, fetchedIndex? : number) : Promise<RatingsMap>
}

export interface ProtocolFactory extends Map<string, () => InterpretationProtocol<ProtocolParams>>{}


/******* DEMO *********

// DEMO implementaiton of a source interpretor
class MyDemoInterpreter<ParamsType extends types.ProtocolParams> implements InterpretationProtocol {
  params:ParamsType
  dataset : Set<any>

  constructor(
    readonly defaults : ParamsType,
    readonly interpret : (params : ParamsType) => Promise<types.PartialRatingsList>,
  ){}

  async fetchData(raters:Set<types.userId>){
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
    let R : types.PartialRatingsList = []
    return R
  }
)

// DEMO export instances
export const mydemo = { myprotocol }

// DEMO use a protocol instance
const myUserList : Set<types.userId> = new Set()
const myParams : MyProtocolParams = {}
const myUserDataSet = await mydemo.myprotocol.fetchData(myUserList)
const myUserRatings = mydemo.myprotocol.interpret(myParams)

/*****************************************/