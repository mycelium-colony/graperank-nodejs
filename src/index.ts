import {calculate} from "./Calculator";
import {interpret} from "./Interpreter";
import * as types from "./types";


export class GrapeRank implements Required<types.EngineRequest>{
  private cache? : types.Scorecard[]
  static params : types.EngineParams = {
    // default infulence score 
    // score : 1,
    // incrementally decrease influence weight
    attenuation : .5,
    // factor for calculating confidence 
    // MUST be bellow 1 or confidence will ALWAYS be 0
    rigor : .25,
    // minimum weight for scorecard to be calculated
    minweight : 0,
    // max difference between calculator iterations
    // ZERO == most precise
    precision : 0
  }

  observer: types.userId;
  context: string;
  input: types.Scorecard[];
  protocols: types.ProtocolRequest[];
  params: types.EngineParams;
  dev : types.DevParams;


  constructor(
    request : types.EngineRequest,
    private fetchcache : boolean = true
  ){
    console.log("GrapeRank : initializing ")
    this.observer = request.observer
    this.context = request.context
    this.input = request.input || []
    this.protocols = request.protocols || []
    this.params = {...GrapeRank.params, ...request.params}
    this.dev = request.dev || {}
  }

  async get(){
    if(this.fetchcache) {
      this.cache = await this.fetch();
    }
    if(!this.cache){
      await this.generate()
    }
    return this.cache

  }

  async fetch() : Promise<types.Scorecard[]>{
    return []
  }

  async generate() {
    let raters = this.raters

    console.log("GrapeRank : calling interpret with " ,raters.length, " authors ...")

    const ratings : types.RatingsList = await interpret(raters, this.protocols)

    // TODO what if new authors are "discovered" by interpretor
    console.log("GrapeRank : calling calculate with "+ratings.length+" ratings and "+this.input?.length+ " scorecards ...")

    this.cache  = calculate(ratings, this)
  }

  // private get scores() : types.Scorecard[] {
  //   let scores = this.request.input || []
  // }

  private get raters() : types.userId[]{
    const raters : types.userId[] = []
    for(let c in this.input){
      if(this.input[c].subject) raters.push(this.input[c].subject)
    }
    return raters.length ? raters : [this.observer]
  }
}

