import { GrapeRankSettings, GrapevineSums, GrapevineScore, GrapevineUserData, GrapevineUserScores, percent, pubkey, GrapevineUsersDataRecord, GrapevineRating } from "./schema";


export class GrapeRank {
  private scores : GrapevineUserScores;
  private userdata : GrapevineUsersDataRecord
  constructor(
    readonly observer : pubkey,
    readonly settings : GrapeRankSettings = new GrapeRankSettings()
  ){}


  /**
   * retrieve cached data for one or more users
   * @param pubkeys
   */
  private async loadUserData( pubkeys:pubkey | pubkey[], retaindata = true):Promise<GrapevineUsersDataRecord>{
    const record : GrapevineUsersDataRecord = {};
    if (typeof(pubkeys) == 'string' ) pubkeys = [pubkeys]
    // TODO call API to retrieve user data
    for(let pubkey in pubkeys){
      record[pubkey] = new GrapevineUserData
    }
    if(retaindata) this.userdata = {...this.userdata, ...record}
    return record
  }


  /**
   * cycle through a list of pubkeys that have been 'rated' by a user
   * @param rater 
   * @param pubkeys 
   * @param interpretation 
   * @param exclude 
   * @returns 
   */
  private calculateRatingSums(
      rater : GrapevineScore,  pubkeys : pubkey[], 
      interpretation : GrapevineRating<"PubkeyList"|"Event">,  exclude : pubkey[] = []
    ) : GrapevineSums {
    let sumofProducts : number = 0;
    let sumofWeights : number = 0;
    // cycle through each pubkey that follows the reter
    pubkeys.forEach((pubkey, item) => {
      // if pubkey is in the observer network and NOT the pubkey being rated
      if (!!this.scores[pubkey]?.influence && !exclude[pubkey]) {
          let weight = this.scores[pubkey].influence * interpretation[1];
          // no attenuationFactor for observer
          if (pubkey != this.observer) 
            weight = weight * this.settings.attenuationFactor;
          // add to sum
          sumofWeights += weight
          sumofProducts += weight * interpretation[0]
      }
    })
    return [sumofProducts,sumofWeights]
  }

  /**
   * iteratively cycle through and map an observer's network
   */
  private calculateInfluence(){
    // for each pubkey
    // calls calculateRatingSums() for follows, mutes, & reports 
    // 
  }

}

