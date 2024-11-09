import { ProtocolParams } from "../../../types.ts";
import { NostrProtocol, applyRatingsByTag, getEventsAuthors, validateEachEventHasAuthor } from "../classes.ts";
import { Event as NostrEvent} from 'nostr-tools/core'

interface FollowsParams extends ProtocolParams {

}

export const follows = new NostrProtocol<FollowsParams>({

  kinds: [3],

  defaults : {
    score : 1,
    confidence : .5
  },

  validate : validateEachEventHasAuthor,

  interpret : (events : Set<NostrEvent>, params : FollowsParams) => {
    return applyRatingsByTag(events,follows)
  }

})