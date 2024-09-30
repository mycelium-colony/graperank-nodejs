import * as Calculator from "./Calculator";
import * as Interpreter from "./Interpreter";
import * as types from "./types";


class GrapeRank {
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
    private fromcache : boolean = true
  ){
    this.params = {...this.params, ...request.params}
  }

  async get(){
    if(this.fromcache) {
      this.cache = await this.fetch();
    }
    if(!this.cache){
      await this.generate()
      this.store()
    }
    return this.cache

  }

  async fetch() : Promise<types.Scorecard[]>{
    return []
  }

  async store(){

  }

  async generate() : Promise<types.Scorecard[]>{

    const ratings : types.RatingsList = await Interpreter.interpret(this.authors, this.request.interpretors)
    // TODO what if new authors are "discovered" by interpretor
    Calculator.calculate(ratings, this.request, this.params)
    return []
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

