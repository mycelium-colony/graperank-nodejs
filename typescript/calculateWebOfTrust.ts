// Derived from brainstorm.ninja influence calculation

import { GrapevineScore, GrapevineUserData, pubkey } from "./schema"

/**
 * Calculates all GrapevineScores 
 * from the perspective of a single subjectUser
 * 
 * @param subjectPubkey 
 * @param allUserData 
 * @returns GrapevineScore[] representing a subject's web of trust
 */
export function calculateWebOfTrust(subjectPubkey :pubkey, allUserData : GrapevineUserData[]) : GrapevineScore[] {
  let weboftrust : GrapevineScore[] = []
  // ...
  return weboftrust;
}
