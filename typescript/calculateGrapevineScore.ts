import { GrapevineScore, GrapevineUserData } from "./schema";

/**
 * Calculates a single targetUser's GrapevineScore 
 * from the perspective of a given subjectUser
 * @param subjectUserData 
 * @param targetUserData 
 * @returns a GrapevineScore object
 */
export function calculateGrapevineScore(subjectUserData :GrapevineUserData, targetUserData : GrapevineUserData) : GrapevineScore{
  let score : GrapevineScore;
  // ...
  return score;
}
