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
    iterations : 8
  }

  observer: types.userId;
  context: string;
  input: types.Scorecard[];
  interpretors: types.InterpreterRequest[];
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
    this.interpretors = request.interpretors || []
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
    let authors = this.authors

    console.log("GrapeRank : calling interpret with " +authors.length+ " authors ...")

    const ratings : types.RatingsList = await interpret(authors, this.interpretors)

    // TODO what if new authors are "discovered" by interpretor
    console.log("GrapeRank : calling calculate with "+ratings.length+" ratings and "+this.input?.length+ " scorecards ...")

    this.cache  = calculate(ratings, this)
  }

  // private get scores() : types.Scorecard[] {
  //   let scores = this.request.input || []
  // }

  private get authors() : types.userId[]{
    const users : types.userId[] = []
    for(let s in this.input){
      if(this.input[s].subject) users.push(this.input[s].subject)
    }
    return users || [this.observer]
  }
}

