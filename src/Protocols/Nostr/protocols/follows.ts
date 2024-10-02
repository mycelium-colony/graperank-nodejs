import { NostrInterpreter, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { Event as NostrEvent} from 'nostr-tools/core'

interface FollowsParams extends types.ProtocolParams {

}

export const follows = new NostrInterpreter<FollowsParams>(
  "follows", [3],
  {
    score : 1,
    confidence : .5
  },
  (events : Set<NostrEvent>, params : FollowsParams) : Promise<types.RatingsList> => {
    return applyRatingsByTag(events,follows)
  }
)