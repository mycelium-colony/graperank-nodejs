import { NostrInterpreter, applyRatingsByTag } from "../classes.ts";
import * as types from "../../../types.ts"
import { NDKEvent } from "@nostr-dev-kit/ndk";


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

export const NostrReportsProtocol = new NostrInterpreter<ReportsParams>(
  "reports", [1984],
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
  (events : Set<NDKEvent>, params : ReportsParams) : types.RatingsList => {
    return applyRatingsByTag(events,params, 'P', 1, 2)
  }
)