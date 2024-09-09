/**
 * type definitions
 */


export type pubkey = string
export type eventid = string

/**
 * All data collected from Nostr relating to a collection of pubkeys
 * (this would be stored in cache)
 */
export type GrapevineUsersDataRecord = Record<pubkey,GrapevineUserData | undefined>
export class GrapevineUserData {
  constructor(
    readonly follows : pubkey[] = [],
    readonly followedBy : pubkey[] = [],
    readonly mutes : pubkey[] = [],
    readonly mutedBy : pubkey[] = [],
    readonly reports : pubkey[] = [],
    readonly reportedBy : pubkey[] = [],
    // ...
  ){}
}

/**
 * 
 */
export class GrapevineScore {
  constructor(
    readonly pubkey : pubkey,
    public average?: number,
    public input?: number,
    public certainty?: number,
    public influence?: number
  ){}
}
export type GrapevineUserScores = Record<pubkey,GrapevineScore | undefined>


/**
 * 
 */
export class GrapevineRating<Type> {
  constructor(
    public score : RatableScore<Type>,
    public confidence : percent = 100,
    readonly rater? : pubkey,
    readonly ratee? : RatableUid<Type>,
    public context? : RatableContext<Type>,
    // readonly type : Ratable<Type>,
  ){}
}

type Ratable<Type> = 
Type extends "Event" ? "Event" : 
Type extends "Pubkey" ? "Pubkey" : 
Type extends "PubkeyList" ? "PubkeyList" : 
  never

type RatableUid<Type> = 
Type extends "Pubkey" ? pubkey : 
Type extends "PubkeyList" ?  3 | 3000 :
Type extends Ratable<Type> ? string : 
  never

type RatableScore<Type> = 
  Type extends "PubkeyList" ? 0 | 1 : 
  Type extends Ratable<Type> ? percent :
  never

type RatableContext<Type> = string;

/**
 * @index 0 = sum of weights of pubkeys doing the rating
 * @index 1 = sum of products (pubkey ratings * sum of weights)
 */
export type GrapevineSums = [number, number]


/**
 * 
 */
export class GrapeRankSettings {
  constructor(
    readonly attenuationFactor : percent = 0,
    readonly rigor : percent = 0,
    readonly defaultPubkeyRating  = new GrapevineRating<"Pubkey">(100),
    readonly followsInterperetation  = new GrapevineRating<"PubkeyList">(1),
    readonly mutesInterperetation  = new GrapevineRating<"PubkeyList">(1),
    readonly reportsInterperetation  = new GrapevineRating<"Event">(100),
    readonly apiEndpoint : string = 'https://api.grapevine.my',
  ){}
}


/**
 * IntRange
 * https://ricardobalk.nl/blog/typescript/ranged-numbers
 * 
 * example :
 * type percent = IntRange<0,100>
 * let myvalue : percent = 101 // ERROR
 */
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>
// type Enumerate<N extends number> = Partial<Record<keyof any, never>> extends infer O ? { [K in keyof O]: K extends N ? never : K } : never;
type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type percent = IntRange<0,101>