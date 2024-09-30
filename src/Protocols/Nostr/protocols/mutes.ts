import { NostrInterpreter, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { NDKEvent } from "@nostr-dev-kit/ndk";

interface MutesParams extends types.ProtocolParams {

}

export const NostrMutesProtocol = new NostrInterpreter<MutesParams>(
  "mutes", [10000],
  {
    score : 0,
    confidence : .5
  },
  (events : Set<NDKEvent>, params : MutesParams) : types.RatingsList => {
    return applyRatingsByTag(events,params)
  }
)