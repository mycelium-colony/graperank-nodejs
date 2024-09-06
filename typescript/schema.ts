/**
 * type definitions
 */


export type pubkey = string

/**
 * All data collected from Nostr 
 * relating to a single pubkey
 * (this would be stored in cache)
 */
export type GrapevineUserData = {
  pubkey : pubkey,
  follows : pubkey[],
  followedBy : pubkey[],
  mutes : pubkey[],
  mutedBy : pubkey[],
  // ...
}

/**
 * G for a given targetUser
 */
export type GrapevineScore = {
  subjectUser : pubkey,
  targetUser : pubkey,
  average: number,
  input: number,
  confidence: number,
  score: number,
}


/**
 * IntRange
 * https://ricardobalk.nl/blog/typescript/ranged-numbers
 * 
 * example :
 * type percent = IntRange<0,100>
 * let myvalue : percent = 1000 // ERROR
 */
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>
// type Enumerate<N extends number> = Partial<Record<keyof any, never>> extends infer O ? { [K in keyof O]: K extends N ? never : K } : never;
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type percent = IntRange<0,100>