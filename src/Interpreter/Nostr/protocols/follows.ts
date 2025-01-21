import { ProtocolParams } from "../../../types";
import { NostrProtocol, applyRatingsByTag, getEventsAuthors, validateEachEventHasAuthor } from "../classes";
import { Event as NostrEvent} from 'nostr-tools/core'

interface FollowsParams extends ProtocolParams {

}

export const follows = new NostrProtocol<FollowsParams>({

  kinds: [3],

  params : {
    score : 1,
    confidence : .5
  },

  validate : validateEachEventHasAuthor,

  interpret : (fetchedIndex : number) => {
    return applyRatingsByTag(follows, fetchedIndex)
  }

})