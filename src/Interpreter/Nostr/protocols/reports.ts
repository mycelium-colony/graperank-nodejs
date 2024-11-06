import { NostrProtocol, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { Event as NostrEvent} from 'nostr-tools/core'


interface ReportsParams extends types.ProtocolParams {
  confidence : number,
  nudity : types.oneorzero, // depictions of nudity, porn, etc.
  malware : types.oneorzero, // virus, trojan horse, worm, robot, spyware, adware, back door, ransomware, rootkit, kidnapper, etc.
  profanity : types.oneorzero, // profanity, hateful speech, etc.
  illegal : types.oneorzero, // something which may be illegal in some jurisdiction
  spam : types.oneorzero, // spam
  impersonation : types.oneorzero, // someone pretending to be someone else
  other : types.oneorzero, // for reports that don't fit in the above categories
}

export const reports = new NostrProtocol<ReportsParams>(
  [1984],
  {
    confidence : .5,
    nudity : 0, // depictions of nudity, porn, etc.
    malware : 0, // virus, trojan horse, worm, robot, spyware, adware, back door, ransomware, rootkit, kidnapper, etc.
    profanity : 0, // profanity, hateful speech, etc.
    illegal : 0, // something which may be illegal in some jurisdiction
    spam : 0, // spam
    impersonation : 0, // someone pretending to be someone else
    other : 0, // for reports that don't fit in the above categories
  },
  undefined,
  (events : Set<NostrEvent>, params : ReportsParams) : Promise<types.PartialRatingsList> => {
    return applyRatingsByTag(events,reports, 'P', 1, 2)
  }
)