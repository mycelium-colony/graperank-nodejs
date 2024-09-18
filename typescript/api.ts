import {CalculatorAPI} from "./Calculator/api";
import {InterpretationAPI} from "./Interpretors/api";
import {RatingsCache} from "./Storage/api";
import { P, userId } from "./types";

export class GrapeRankApi {
  prefs : P;
  constructor(observer : userId, prefs? : Partial<P>){
    prefs = {...prefs, observer}
    this.prefs = new GrapeRankPrefs(prefs)
  }


}

class GrapeRankPrefs implements P {

  readonly observer: userId 
  readonly attenuation = 0// 0 -1 
  readonly rigor  = 0// 0 -1
  readonly calculator = {
    confidence : 1, // 0 - 1
    score : 1, // number
    influence : 1  // number
  }
  readonly interpretators = {}
  readonly presets : {}

  constructor(prefs : Partial<P>){
    for(let p in prefs){
      this[p] = typeof prefs[p] == 'object' ? {...this[p], ...prefs[p]} : prefs[p]
    }
  }

}