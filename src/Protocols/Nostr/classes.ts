import {Interpreter} from "../classes.ts"
import * as types from "../../types.ts"
import NDK, { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";

const ndk = new NDK({
  explicitRelayUrls: [
    "wss://relay.purplepag.es", 
    "wss://profiles.nostr1.com",
    "wss://relay.damus.io",
  ]
})

export class NostrInterpreter<ParamsType extends types.ProtocolParams> implements Interpreter {
  readonly source = 'nostr'
  params : ParamsType
  dataset : Set<NDKEvent>
  interpret : (params : ParamsType) => types.RatingsList

  constructor( 
    readonly protocol : types.slug,
    readonly kinds : number[],
    readonly defaults : ParamsType,
    callback : (events:Set<NDKEvent>, params : ParamsType) => types.RatingsList,
  ){
    this.interpret = (params:ParamsType) => {
      this.params = {...this.defaults, ...params}
      return callback(this.dataset, this.params)
    }
  }
  
  async fetchData(authors : string[], filter?: NDKFilter) : Promise<void> {
    await ndk.connect(5000)
    let events = {}
    // TODO fix for duplicate fetching of kinds
    let ndkfilter : NDKFilter = {
      ...filter,
      kinds : this.kinds,
      authors ,
    }
    this.dataset = await ndk.fetchEvents(ndkfilter)
    return
  }

}

export  function  applyRatingsByTag(events : Set<NDKEvent>, params : types.ProtocolParams, tag = "P", rateeindex = 1, scoreindex? : number) : types.RatingsList {

  let R : types.RatingsList = []
  let rating : Partial<types.Rating> = {
    // apply a single score for all events, if indicated in params.score
    score : params?.score as number || 0,
    confidence : params?.confidence as number || .5,
    context : "nostr-"+ this.protocol
  }

  for(let e in events){
    for(let t in events[e].tags){
      if(events[e].tags[t][0] == tag){
        // apply a custom score per tag according to scoreindex and prefs
        if(scoreindex && params) rating.score = params[events[e].tags[t][scoreindex]] as unknown as number || 0
        rating.rater = events[e].pubkey
        rating.ratee = events[e].tags[t][rateeindex]
        R.push(rating as types.Rating )
      }
    }
  }
  return R

}


export type pubkey = string
export type signature = string

/**
 * All data collected from Nostr relating to a collection of pubkeys
 */
export type NostrUserCache = Record<
  pubkey, {
    readonly follows : pubkey[],
    readonly followedBy : pubkey[],
    readonly mutes : pubkey[],
    readonly mutedBy : pubkey[],
    readonly reports : pubkey[],
    readonly reportedBy : pubkey[],
    // ...
  }>