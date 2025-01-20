import { NostrProtocol, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { Event as NostrEvent} from 'nostr-tools/core'

interface MutesParams extends types.ProtocolParams {

}

export const mutes = new NostrProtocol<MutesParams>({
  kinds : [10000],

  params : {
    score : 0,
    confidence : .5
  },
  interpret : (fetchedIndex? : number) => {
    return applyRatingsByTag(mutes, fetchedIndex)
  }
})