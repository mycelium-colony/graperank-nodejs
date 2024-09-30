import { NostrInterpreter, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { NDKEvent } from "@nostr-dev-kit/ndk";

interface FollowsParams extends types.ProtocolParams {

}

export const NostrFollowsProtocol = new NostrInterpreter<FollowsParams>(
  "follows", [3],
  {
    score : 1,
    confidence : .5
  },
  (events : Set<NDKEvent>, params : FollowsParams) : types.RatingsList => {
    return applyRatingsByTag(events,params)
  }
)