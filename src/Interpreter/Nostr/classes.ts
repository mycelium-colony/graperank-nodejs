import {InterpretationProtocol} from "../classes.ts"
import * as types from "../../types.ts"
import { Event as NostrEvent} from 'nostr-tools/core'
import { Filter as NostrFilter} from 'nostr-tools/filter'
import { SimplePool } from 'nostr-tools/pool'
import { useWebSocketImplementation } from 'nostr-tools/pool'
import WebSocket from 'ws'
useWebSocketImplementation(WebSocket)
import {mergeBigArrays, sliceBigArray} from "../../utils.ts"

const relays = [
  "wss://purplepag.es",
  "wss://profiles.nostr1.com",
  "wss://relay.primal.net",
  // "wss://relay.damus.io"
]

const maxauthors = 1000

export class NostrProtocol<ParamsType extends types.ProtocolParams> implements InterpretationProtocol {
  params : ParamsType
  dataset : Set<NostrEvent> = new Set()
  interpret : (params : ParamsType) => Promise<types.RatingsList>

  constructor( 
    readonly kinds : number[],
    readonly defaults : ParamsType,
    readonly validate? : (events : Set<NostrEvent>, authors : types.userId[], previous? : Set<NostrEvent>) => boolean | types.userId[],
    interpret? : (events:Set<NostrEvent>, params : ParamsType) => Promise<types.RatingsList>
  ){
    this.interpret = async (params:ParamsType) => {
      console.log("GrapeRank : nostr protocol : interptreting " +this.dataset.size+ " events")
      this.params = {...this.defaults, ...params}
      let ratings = 
        interpret ? await interpret(this.dataset, this.params) :
        await applyRatingsByTag(this.dataset, this)
      console.log("GrapeRank : nostr protocol : interptreting "+ratings.length+" ratings")
      return ratings
    }
  }

  // breaks up a large raters list into multiple authors lists 
  // suitable for relay requests, and sends them all in parrallel
  // returns a single promise that is resolved when all fetches are complete.
  async fetchData(raters : Set<types.userId>, filter?: NostrFilter) : Promise<void> {

    const authors : types.userId[][] = raters.size > maxauthors ? 
      await sliceBigArray([...raters], maxauthors) : [[...raters]]

    const promises : Promise<Set<NostrEvent>>[] = []
    let promise : Promise<Set<NostrEvent>>

    console.log("GrapeRank : nostr protocol : fetching events in ",authors.length, " requests for ",raters.size," raters")

    for(let a in authors){
      let fetchfilter : NostrFilter = {
        ...filter, 
        authors : authors[a] as string[],
        kinds : this.kinds,
      }
      promise = this.fetchEventsPromise(fetchfilter, a as unknown as number)
      promises.push(promise)
    }

    await Promise.all(promises)

    console.log("GrapeRank : nostr protocol : fetching complete with ", this.dataset.size, " records ")
  }

  // An iterative function ... 
  // possibly calls itself again if validation fails
  // returns a single promise with possibly nested promises
  private async fetchEventsPromise(filter: NostrFilter, iteration = 0, previous? : Set<NostrEvent>) : Promise<Set<NostrEvent>> {
    if(!filter.authors) 
      return new Promise((resolve,reject)=> reject("No authors provided"))

    console.log("GrapeRank : nostr protocol : fetching events in request ",iteration, " for ",filter.authors.length, " raters")

    let fetchpromise = fetchEvents(filter)
      fetchpromise.then(async (events)=>{
        let validation = this.validate ? this.validate(events, filter.authors as string[], previous) : true
        let totaleventssize : number
        try{

          // FALSE validation will log error
          if(validation === false ) {
            throw('validaiton failed')
          }

          // TRUE validation will add events to dataset
          events.forEach((event) => this.dataset.add(event))
          if(validation === true){ 
            totaleventssize = previous ? (previous.size + events.size ): events.size
            throw("completed with " + totaleventssize + " events")
          }

          // otherwise try request again with reduced authors list
          console.log("GrapeRank : nostr protocol : fetch request ",iteration," : requesting again")
          await this.fetchEventsPromise(
            {...filter, authors : validation as string[]}, 
            iteration, events )

        }catch(e){
          console.log("GrapeRank : nostr protocol : fetch request ",iteration," : ", e)
        }
  
      }).catch((error)=>{
        console.log("GrapeRank : nostr protocol : ERROR in fetch request ", iteration, error)
      })
      
    return fetchpromise
  }
  
}


export async function  applyRatingsByTag(events : Set<NostrEvent>, protocol : NostrProtocol<any>, tag = "p", rateeindex = 1, scoreindex? : number) : Promise<types.RatingsList> {
  console.log("GrapeRank : nostr protocol : applyRatingsByTag()")
  let ratings : types.RatingsList = [],
    numevents : number = events.size, 
    eventindex : number = 0, 
    numratings : number , 
    numskipped : number,
    ratingpartial : Partial<types.Rating> = {
      // apply a single score for all ratings, as indicated in params.score
      score : protocol.params?.score as number || 0,
      confidence : protocol.params?.confidence as number || .5,
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
      console.log("GrapeRank : nostr protocol : applyRatingsByTag : event not processed")
    }
    // handle big arrays with care
    if(eventratings) ratings = await mergeBigArrays(ratings, eventratings, 10000)
  }
  console.log("GrapeRank : nostr protocol : applyRatingsByTag : returned ", ratings.length, " ratings")
  return ratings
}


export function validateEachEventHasAuthor( events : Set<NostrEvent>, authors : types.userId[], previous? : Set<NostrEvent> ) : boolean | types.userId[] { 
  if(authors.length == events.size) return true
  if(!validateOneEventIsNew(events,authors,previous)) return false
  let authorswithoutevents = getEventsAuthors(events, authors) 
  return authorswithoutevents.length ? authorswithoutevents : true
}

export function validateOneEventIsNew( events : Set<NostrEvent>, authors : types.userId[], previous? : Set<NostrEvent> ) : boolean | types.userId[] { 
  if(!previous || !previous.size) return true
  previous.forEach((pevent)=>{
    events.forEach((newevent)=>{
      if(pevent.id == newevent.id) return true
    })
  })
  return false
}


export function getEventsAuthors(events: Set<NostrEvent>, exclude? : types.userId[]) : types.userId[]{
  const authors : types.userId[] = []
  events.forEach((event)=> {
    if(!exclude || !exclude.includes(event.pubkey))
      authors.push(event.pubkey)
  })
  return authors
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


/**
 * Adapted from NDK
 * @param filters 
 * @returns 
 */
async function fetchEvents(
    filters: NostrFilter | NostrFilter[]
): Promise<Set<NostrEvent>> {
    filters = filters instanceof Array ? filters : [filters]
    return new Promise((resolve) => {
        const events: Map<string, NostrEvent> = new Map();

        // console.log("GrapeRank : nostr protocol : fetchEvents() : calling fetch() for ", )

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
