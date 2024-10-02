import {calculate} from "./Calculator";
import {interpret} from "./Interpreter";
import * as types from "./types";


export class GrapeRank {
  private cache? : types.Scorecard[]
  private params : types.EngineParams = {
    // default infulence score 
    score : 1,
    // incrementally decrease influence weight
    attenuation : .5,
    // factor for calculating confidence
    rigor : 1,
    // minimum weight for scorecard to be calculated
    minweight : 0
  }

  constructor(
    private request : types.EngineRequest,
    private fetchcache : boolean = true
  ){
    console.log("GrapeRank : initializing ")
    this.params = {...this.params, ...request.params}
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
    const ratings : types.RatingsList = await interpret(authors, this.request.interpretors)
    // TODO what if new authors are "discovered" by interpretor
    console.log("GrapeRank : calculating scorecards for ratings ...")
    this.cache  = calculate(ratings, this.request, this.params)
  }

  // private get scores() : types.Scorecard[] {
  //   let scores = this.request.input || []
  // }

  private get authors() : types.userId[]{
    const users : types.userId[] = []
    for(let s in this.request.input){
      users.push(this.request.input[s].subject)
    }
    return users || [this.request.observer]
  }
}

