import {InterpretorSource} from "../Interpretors.ts"
import * as types from "../../types.ts"
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { RatingsCache } from "../../Storage/api.ts";


// Each RatableClass modules file MUST be exported 
// with a new `export` directive in Ratables.ts

export class NostrInterpretor implements InterpretorSource {

  readonly source : 'nostr'

  readonly ndk : NDK

  readonly defaults = {
    3 : {
      score : 1,
      confidence : .5
    },
    10000 : {
      score : 0,
      confidence : .5
    },
    1984 : {
      nudity : 0, // depictions of nudity, porn, etc.
      malware : 0, // virus, trojan horse, worm, robot, spyware, adware, back door, ransomware, rootkit, kidnapper, etc.
      profanity : 0, // profanity, hateful speech, etc.
      illegal : 0, // something which may be illegal in some jurisdiction
      spam : 0, // spam
      impersonation : 0, // someone pretending to be someone else
      other : 0, // for reports that don't fit in the above categories
    }
  }

  constructor( 
    readonly params:types.InterpretorParams
  ){
    this.ndk = new NDK({
      explicitRelayUrls: [
        "wss://relay.purplepag.es", 
        "wss://profiles.nostr1.com",
        "wss://relay.damus.io",
      ]
    })
    this.ndk.connect()
  }

  async fetchData(){
    let events = {}
    for(let i in this.params.interpretations){
      let interpretation = this.params.interpretations[i]
      let filter = {
        kind : interpretation.kind,
        pubkeys : this.params.raters,
        ...interpretation.filter
      }
      events[interpretation.kind] = await this.ndk.fetchEvents(filter)
    }
    return events;
  }

  readonly interpretRatings = {

    /**
     * Interpret kind 3 follows lists
     */
    3 : (events : NDKEvent[], author? : types.userId, prefs? : types.ParamsObject) : types.R => {
      let kind = 3
      let R = applyRatingByTag(kind, events, prefs)
      return R
    },

    /**
     * Interpret kind 10000 mute lists
     */
    10000 : (events : NDKEvent[], author? : types.userId, prefs? : types.ParamsObject) : types.R => {
      let R =  applyRatingByTag(10000, events, prefs)
      return R
    },
    
    /**
     * Interpret kind 1984 reports
     */
    1984 : (events : NDKEvent[], author? : types.userId, prefs? : types.ParamsObject) : types.R => {
      let R = applyRatingByTag(1984, events, prefs, 'P', 1, 2)
      return R
    }

  }
}

function applyRatingByTag(kind: number, events : NDKEvent[], prefs? : types.ParamsObject, tag = "P", rateeindex = 1, scoreindex? : number) : types.R {
  prefs = {...this.defaults[kind], ...prefs}
  let R : types.R = {}
  let rating = {
    // apply a single score for all events, if indicated in prefs.score
    score : prefs?.score as number || 0,
    confidence : prefs?.confidence as number || .5,
    context : ['grapevine.my', 'nostr', kind.toString()]
  }
  for(let e in events){
    for(let t in events[e].tags){
      if(events[e].tags[t][0] == tag){
        // apply a custom score per tag according to scoreindex and prefs
        if(scoreindex && prefs) rating.score = prefs[events[e].tags[t][scoreindex]] as unknown as number || 0
        R[events[e].pubkey][events[e].tags[t][rateeindex]] = rating
      }
    }
  }
  return R
}