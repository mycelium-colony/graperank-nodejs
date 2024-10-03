import {Interpreter} from "../classes.ts"
import * as types from "../../types.ts"
// import NDK, { NostrEvent, NostrFilter, NDKRelay, NDKRelaySet, NDKSubscriptionOptions, NostrEvent } from "@nostr-dev-kit/ndk";
import { Event as NostrEvent} from 'nostr-tools/core'
import { Filter as NostrFilter} from 'nostr-tools/filter'
import { SimplePool } from 'nostr-tools/pool'
import { useWebSocketImplementation } from 'nostr-tools/pool'
import WebSocket from 'ws'
useWebSocketImplementation(WebSocket)
import {mergeBigArrays} from "../../utils.ts"

const relays = [
  "wss://relay.purplepag.es",
  "wss://profiles.nostr1.com",
  "wss://relay.damus.io"
]
// // const ndk = new NDK()
// const ndk = new NDK({explicitRelayUrls : relays})
// await ndk.connect().then(()=>{
//   // console.log("GrapeRank : nostr : ndk connected")
// })


// const relayset : Set<NDKRelay> = new Set()
// for(let u in relays){
//   relayset.add(new NDKRelay(relays[u],undefined,ndk))
// }
// const ndkrelayset = new NDKRelaySet(relayset,ndk)


export class NostrInterpreter<ParamsType extends types.ProtocolParams> implements Interpreter {
  readonly source = 'nostr'
  params : ParamsType
  dataset : Set<NostrEvent>
  interpret : (params : ParamsType) => Promise<types.RatingsList>

  constructor( 
    readonly protocol : types.slug,
    readonly kinds : number[],
    readonly defaults : ParamsType,
    callback : (events:Set<NostrEvent>, params : ParamsType) => Promise<types.RatingsList>,
  ){
    this.interpret = async (params:ParamsType) => {
      console.log("GrapeRank : nostr-" +this.protocol+ " : interpreting " +this.dataset.size+ " events")
      this.params = {...this.defaults, ...params}
      let ratings = await callback(this.dataset, this.params)
      console.log("GrapeRank : nostr-" +this.protocol+ " : interpreted "+ratings.length+" ratings")
      return ratings
    }
  }
  
  async fetchData(authors : string[], filter?: NostrFilter) : Promise<void> {
    console.log("GrapeRank : nostr-" +this.protocol+ " : fetchData()")
    // TODO fix for duplicate fetching of kinds
    let NostrFilter : NostrFilter = {
      ...filter,
      kinds : this.kinds,
      authors ,
    }

    await fetchEvents(NostrFilter).then((events)=>{
      this.dataset = events
      console.log("GrapeRank : nostr-" +this.protocol+ " : fetched " +this.dataset.size+ " records")
    }).catch((error)=>{
      console.log("GrapeRank : nostr-" +this.protocol+ " :  ERROR ", error)
    }).finally(()=>{
      console.log("GrapeRank : nostr-" +this.protocol+ " :  fetchData() complete ")
    })
    // this.dataset = await ndk.fetchEvents(NostrFilter,{},ndkrelayset)
    return
  }

}

export async function  applyRatingsByTag(events : Set<NostrEvent>, protocol : NostrInterpreter<any>, tag = "p", rateeindex = 1, scoreindex? : number) : Promise<types.RatingsList> {
  console.log("GrapeRank : applyRatingsByTag()")
  let ratings : types.RatingsList = [],
    numevents : number = events.size, 
    eventindex : number = 0, 
    numratings : number , 
    numskipped : number,
    ratingpartial : Partial<types.Rating> = {
      // apply a single score for all ratings, as indicated in params.score
      score : protocol.params?.score as number || 0,
      confidence : protocol.params?.confidence as number || .5,
      context : "nostr-"+ protocol.protocol
    }
  // loop through all events to find tags for making new ratings
  for(const event of events) {
    eventindex ++
    // console.log("GrapeRank : applyRatingsByTag : proccessing event "+eventindex+"/"+numevents+" with " + event.tags.length + " tags")
    let eventratings : types.RatingsList = []
    // loop through all tags of each event to find the ones to make ratings from
    if(!!event.tags && event.tags.length < 10000){
      numratings = 0
      numskipped = 0
      for(let t in event.tags){
        // `tag` argument defines what event tag to makes ratings from
        if(event.tags[t][0] == tag){
          let rating = {...ratingpartial}
          // if `scoreindex` argument has been defined...
          // and if the value of this tag[scoreindex] is a property in params ...
          // then apply a custom score per rating according to the index value in params
          if(scoreindex && protocol.params) {
            rating.score = protocol.params[event.tags[t][scoreindex]] as unknown as number || 0
          }
          rating.rater = event.pubkey
          // `rateeindex` argument determines the tag index from which to get 
          // the ID of what's been rated
          rating.ratee = event.tags[t][rateeindex]
          eventratings.push(rating as types.Rating)
          numratings ++
        }else{
          numskipped ++
        }
      }
      // console.log("GrapeRank : applyRatingsByTag : event processed : ", +numratings+ " tags rated : ",  +numskipped+ " tags skipped")
    }else{
      console.log("GrapeRank : applyRatingsByTag : event not processed")
    }
    // handle big arrays with care
    if(eventratings) ratings = await mergeBigArrays(ratings, eventratings)
  }
  console.log("GrapeRank : applyRatingsByTag : returned ", ratings.length, " ratings")
  return ratings
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





async function fetchEvents(
    filters: NostrFilter | NostrFilter[],
    // opts?: NDKSubscriptionOptions,
    // relaySet?: NDKRelaySet
): Promise<Set<NostrEvent>> {
    filters = filters instanceof Array ? filters : [filters]
    return new Promise((resolve) => {
        const events: Map<string, NostrEvent> = new Map();

        console.log("GrapeRank : nostr : fetchEvents() : calling ndk.subscribe() ")
        // const relaySetSubscription = ndk.subscribe(
        //     filters,
        //     { ...(opts || {}), closeOnEose: true },
        //     relaySet,
        //     false
        // );
        // relaySetSubscription.on("closed", (relay, string)=>{
        //   console.log("GrapeRank : nostr : fetchEvents() : subscription closed : ", relay, string)
        // })

        const onEvent = (event: NostrEvent) => {
          // console.log("GrapeRank : nostr : fetchEvents() : recieved kind-"+event.kind, event.id)
            // if (!(event instanceof NostrEvent)) event = new NostrEvent(undefined, event);

            const dedupKey = deduplicationKey(event);

            const existingEvent = events.get(dedupKey);
            if (existingEvent) {
                event = dedupEvent(existingEvent, event);
            }

            // event.ndk = ndk;
            events.set(dedupKey, event);
        };

        

        // // We want to inspect duplicated events
        // // so we can dedup them
        // relaySetSubscription.on("event", onEvent);
        // // relaySetSubscription.on("event:dup", (rawEvent: NostrEvent) => {
        // //     const NostrEvent = new NostrEvent(undefined, rawEvent);
        // //     onEvent(NostrEvent)
        // // });

        // relaySetSubscription.on("eose", () => {
        //     resolve(new Set(events.values()));
        // });



        // relaySetSubscription.start();

        const pool = new SimplePool()

        let h = pool.subscribeMany(
          [...relays],filters,
          {
            onevent : onEvent,
            oneose() {
              h.close()
              resolve(new Set(events.values()));
            }
          }
        )
    });
}

function dedupEvent(event1: NostrEvent, event2: NostrEvent) {
  // return the newest of the two
  if (event1.created_at! > event2.created_at!) {
      return event1;
  }
  return event2;
}

/**
 * Provides a deduplication key for the event.
 *
 * For kinds 0, 3, 10k-20k this will be the event <kind>:<pubkey>
 * For kinds 30k-40k this will be the event <kind>:<pubkey>:<d-tag>
 * For all other kinds this will be the event id
 */
function deduplicationKey(event: NostrEvent): string {
  if (
      event.kind === 0 ||
      event.kind === 3 ||
      (event.kind && event.kind >= 10000 && event.kind < 20000)
  ) {
      return `${event.kind}:${event.pubkey}`;
  } else {
      return event.id;
  }
}
