import {InterpretorClass} from "../Interpretors.ts"
import * as types from "../../types.ts"
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";


// Each RatableClass modules file MUST be exported 
// with a new `export` directive in Ratables.ts

export class NostrInterpretor implements InterpretorClass {

  readonly ndk : NDK

  readonly prefs = {
    3 : {
      score : 1,
      confidence : .5
    },
    10000 : {
      score : 1,
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
      // merge passed in prefs with default prefs
      prefs = {...this.prefs[3], ...prefs}
      let rating = {
        score : prefs.score  as number,
        confidence : prefs.confidence  as number,
        context : ['grapevine.my', 'nostr', '3']
      }
      return applyRatingByTag(rating,events)
    },

    /**
     * Interpret kind 10000 mute lists
     */
    10000 : (events : NDKEvent[], author? : types.userId, prefs? : types.ParamsObject) : types.R => {
      // merge passed in prefs with default prefs
      prefs = {...this.prefs[10000], ...prefs}
      let rating = {
        score : prefs?.score  as number,
        confidence : prefs?.confidence  as number,
        context : ['grapevine.my', 'nostr', '10000']
      }
      return applyRatingByTag(rating,events)
    },
    
    /**
     * Interpret kind 1984 reports
     */
    1984 : (events : NDKEvent[], author? : types.userId, prefs? : types.ParamsObject) : types.R => {
      let R : types.R = {}
      // merge passed in prefs with default prefs
      prefs = {...this.prefs[10000], ...prefs}
      let rating = {
        score : 0,
        confidence : prefs.confidence as number,
        context : ['grapevine.my', 'nostr', '1984']
      }
      // apply a single rating for all reported pubkeys, if indicated in prefs.score
      // otherwise apply rating for reported pubkeys according to report type
      for(let e in events){
        for(let tag in events[e].tags){
          if(tag[0] == "P"){
            rating.score = ( prefs.score || prefs[tag[2]] || 0 ) as number
            R[events[e].pubkey][tag[1]] = rating
          }
        }
      }
      return R
    }

  }
}

function applyRatingByTag(rating : types.Rating, events : NDKEvent[], tag = "P") : types.R{
  let R : types.R = {}
  for(let e in events){
    for(let tag in events[e].tags){
      if(tag[0] == "P"){
        R[events[e].pubkey][tag[1]] = rating
      }
    }
  }
  return R
}