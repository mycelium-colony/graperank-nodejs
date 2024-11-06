import { NostrProtocol, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { Event as NostrEvent} from 'nostr-tools/core'

interface MutesParams extends types.ProtocolParams {

}

export const mutes = new NostrProtocol<MutesParams>(
  [10000],
  {
    score : 0,
    confidence : .5
  },
  undefined,
  (events : Set<NostrEvent>, params : MutesParams) : Promise<types.PartialRatingsList> => {
    return applyRatingsByTag(events,mutes)
  }
)