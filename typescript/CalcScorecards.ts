
type pubkey = string
type uid = string
type context = string

/**
 * A Scorecards Table 
 * Input and output from GrapeRank calculations
 * pubkey = observer
 * uid = being observed
 */
type G = Record< 
  pubkey, Record< 
    uid, Scorecard >>

class Scorecard {
  constructor(
   public influence : number = 0, // non negative number 
   public average : number = 0, // number
   public weights : number = 0, // non negative number 
   public confidence : number = 0, // 0 - 1
   public totals : number = 0, // mutable
   public context? : string // TODO Scorecard might need to be indexed by context
  ){}
}

/**
 * A Ratings Table per Event Kind for ALL of Nostr
 * Input for GrapeRank calculations
 * pubkey = rater
 * uid = being rated
 */
type R = Record< 
  pubkey, Record< 
    uid, Rating | undefined >>

class Rating {
  confidence : number // 0 - 1
  score : number // 0 or 1 / percent
  context? : string // TODO Rating might need to be indexed by context
}

type APIRatingsParams = {
  pubkeys : pubkey[]
  // observer : pubkey
  kinds : number[]
  // confidence : number // 0 - 1
  // scoreModifierCallback : Function
}


/**
 * Observer Parameters for GrapeRank
 */
class P {
  observer: pubkey
  attenuation : number // 0 -1 
  rigor : number // 0 -1
  default : {
    confidence : number // 0 - 1
    score : number // number
    influence : number // number
  }
}



function APIrequest(APIRatingsParams) : R[] {
  return {}[]
}


// FIXME PSEUDO CODE !!
function calculateRatings(events : any[], params : {}):R{
  let R_out : R = {}
  for(let event in events){
    let kind = event.kind
    let author : pubkey = event.pubkey
    let callback : Function | undefined = undefined;
    let authorRatings = {}
    switch(kind){
      case 3 : callback = getAuthorRatingForEventKind_3
      case 1984 : callback = getAuthorRatingForEventKind_1984
      // case 10000 : callback = getRatingForEventKind_10000
      break
    }
    if(callback) R_out[author] = {...authorRatings, ...callback(event)}
  }
  return R_out
}

function getAuthorRatingForEventKind_3(event) : {[k:uid]:Rating} {
  let follows : pubkey[] = getFollowsFromKind3(event)
  let authorRatings = {}
  for(let pubkey in follows){
    authorRatings[pubkey] = followRating
  }
  return authorRatings
}


function getAuthorRatingForEventKind_1984(event) :  {[k:uid]:Rating} {
  let reported : pubkey = getTagFromEvent(event, "p")
  R_out[author][reported] = reportRating
}





type GID = [pubkey?,uid?,context?] 

// return G from cache using GID
function getScorecardsFromCache(gid: GID) : G {
    return {}
}

function calculateScorecards( G : G, R : R, P : P) : G {
    // const g_out = new G()
    let rated : {[x:uid] : Scorecard} = {}
    let raters = {}
    // Step 1 : for each pubkey in R
    for(let pubkey in R){
      raters[pubkey] = G[P.observer][pubkey]?.influence || P.default.influence
      for(let uid in R[pubkey]){
        // step 2 : for each UID in R[pubkey]
        if(!rated[uid]){
          rated[uid] = new Scorecard()
        }
        // calculate weight & product
        let weight = raters[pubkey] * R[pubkey][uid].confidence;
        // no attenuationFactor for observer
        if (pubkey != P.observer) 
          weight = weight * P.attenuation;
        // add to sum
        rated[uid].weights += weight
        rated[uid].totals += weight * R[pubkey][uid].score
      }
    }
    for(let uid in rated){
      if(rated[uid].weights > 0){
        rated[uid].average = rated[uid].totals / rated[uid].weights
        rated[uid].confidence = convertWeightsToCertainty(rated[uid].weights, P.rigor)
        rated[uid].influence = rated[uid].average * rated[uid].confidence
      }
    }
    return {observer:rated}
  }

function convertWeightsToCertainty(weights : number, rigor : number){
    const rigority = -Math.log(rigor)
    const fooB = -weights * rigority
    const fooA = Math.exp(fooB)
    const certainty = 1 - fooA
    return certainty.toPrecision(4) as unknown as number // FIXME
  }
  


