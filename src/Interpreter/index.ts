import { Protocols } from "./protocols"
import { forEachBigArray, DEBUGTARGET } from "../utils"
import { ProtocolRequest, RatingsList, userId , protocol, InterpreterResults, ProtocolResponse, RatingsMap} from "../types"

export async function interpret(raters:userId[], requests? : ProtocolRequest[] ) : Promise<InterpreterResults>{
  const protocol = new Protocols()
  let responses : ProtocolResponse[] = []
  let ratings : RatingsList = []
  // `allraters` map keys hold all raters added as input and between protocol requests
  // map value is the iteration number at which the rater was added
  // (this number ends up in the scorecard as `dos` from observer) 
  const allraters : Map<userId,number> = new Map()
  let requestauthors : Set<userId> | undefined

  if(!!raters && !!requests){
    console.log("GrapeRank : interpret : instantiating ",requests.length, " protocols for ",raters.length," raters")
    console.log("----------------------------------")
    // add input raters to allraters
    raters.forEach((userid) => allraters.set(userid,0))

    // loop through each interpreter request
    // requests having `iterations` will ADD to `allraters` with each interation
    // each request will use the `allraters` list from previous requests
    for(let r in requests){
      let requestindex = r as unknown as number
      let request = requests[requestindex]
      protocol.setRequest(request)
      // reset newraters, protocolratings, and newratings between protocol requests
      const protocolratings = protocol.getInterpreted(request.protocol)
      let newraters : Set<userId> = new Set()
      let newratings : RatingsMap = new Map()
      let thisiteration : number = 0
      let maxiterations : number = request.iterate || 1
      let thisiterationraters : Set<userId>
      if(request.authors && request.authors.length) requestauthors = new Set(request.authors)

      // console.log("GrapeRank : interpret : calling " +request.protocol+" protocol with ", maxiterations," iterations")

      while(thisiteration < maxiterations){
        // increment for each protocol iteration
        thisiteration ++
        thisiterationraters = requestauthors || ( newraters.size ?  newraters : new Set(allraters.keys()) )
        console.log("GrapeRank : interpret : "+request.protocol+" protocol : begin iteration ", thisiteration, " of ", maxiterations,", with ",thisiterationraters.size," raters")
        // DEBUG
        if(thisiterationraters.has(DEBUGTARGET))
          console.log('DEBUGTARGET : interpret : target found in thisiteration raters')

        try{
          // fetch protocol specific dataset for requestauthors OR newraters OR allraters
          let dos = await protocol.fetchData(request.protocol, thisiterationraters)
          // interpret fetched data and add to newratings
          newratings = await protocol.interpret(request.protocol, dos)
          console.log("GrapeRank : interpret : ",request.protocol," protocol : interpretation complete for iteration ",thisiteration)

          // prepare for next iteration ONLY IF not on final iteration
          if(thisiteration < maxiterations) {
            // get new raters from interpreted newratings
            newraters = getNewRaters(newratings, allraters)
            // merge all raters to include new raters
            newraters.forEach((rater) => allraters.set(rater, thisiteration))
            console.log("GrapeRank : interpret : "+request.protocol+" protocol : added " ,newraters.size, " new raters, for a total of ", allraters.size)
          }

        }catch(e){
          console.log('GrapeRank : interpret : ERROR : ',e)
        }

        responses.push({
          protocol : request.protocol,
          index : requestindex,
          iteration : thisiteration,
          numraters : thisiterationraters.size,
          // TODO get numfetched from protocol
          numfetched : undefined,
          numratings : newratings.size
        })

        console.log("GrapeRank : interpret : "+request.protocol+" protocol : end iteration ", thisiteration, " of ", maxiterations)
        console.log("----------------------------------")
      }

      // add the final map of protocolratings to ratings list
      addToRatingsList(request.protocol, r as unknown as number, protocolratings, ratings)
    }
    // DEBUG duplicate ratings
    let numtargetratings : Map<userId,number> = new Map()
    await forEachBigArray(ratings,(rating)=>{
      if(rating.ratee == DEBUGTARGET) {
        let numratings = numtargetratings.get(rating.rater) || 0
        numtargetratings.set(rating.rater,numratings + 1)
      }
    })
    numtargetratings.forEach((num,key)=>{
      if(num > 1)
      console.log('DEBUGTARGET : interperet : found more than ONE rating for ', key)
    }) 
  
  }
  protocol.clear()
  return {ratings, responses}

}



// FIXME this ONLY works when USERS are being rated, not CONTENT
// TODO extraction of new authors from rated content SHOULD be handled by each protocol ...  
function getNewRaters(newratings : RatingsMap, allraters? : Map<userId, number>) : Set<userId>{
  let newraters : Set<userId> = new Set()
  newratings.forEach((rateemap)=>{
    rateemap.forEach((ratingdata, ratee)=>{
      if(!allraters || !allraters.has(ratee)) newraters.add(ratee)  
    })
  })
  // DEBUG
  if(newraters.has(DEBUGTARGET))
    console.log('DEBUGTARGET : interpret : target found by getNewRaters()')
  return newraters
}

function addToRatingsList(protocol : protocol, index : number, ratingsmap : RatingsMap, ratingslist: RatingsList){
  ratingsmap.forEach((rateemap,rater)=>{
    rateemap.forEach((ratingdata,ratee)=>{
      ratingslist.push({
        protocol,
        index,
        rater,
        ratee,
        ...ratingdata
      })
    })
  })
}
