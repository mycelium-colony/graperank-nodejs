import { NostrProtocol, applyRatingsByTag, getEventsAuthors, validateEachEventHasAuthor } from "../classes.ts";
import * as types from "../../../types.ts"
import { Event as NostrEvent} from 'nostr-tools/core'

interface FollowsParams extends types.ProtocolParams {

}

export const follows = new NostrProtocol<FollowsParams>(
  [3],
  {
    score : 1,
    confidence : .5
  },
  validateEachEventHasAuthor,
  (events : Set<NostrEvent>, params : FollowsParams) : Promise<types.PartialRatingsList> => {
    return applyRatingsByTag(events,follows)
  }
)