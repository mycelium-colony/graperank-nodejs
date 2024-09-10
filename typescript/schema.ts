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
 * A customizable worldview
 */
export class GrapevineWorldview<Types = (string | kindnumber)[]> {
  name : string
  ratables : Ratables<RatableClasses<Types>>[]
  ratings : GrapevineRatingsTable<Types>
}

/**
 * A table of Ratings, indexed by rater's pubkey and a UID for the ratable event 
 */
export type GrapevineRatingsTable<Types = (string | number)[]> = 
  Record<pubkey,Record<RatableUids<Types>,GrapevineRatings<Types>>>

/**
 * an Instamnce of R, where Type can be one of:
 * string : a search parameter to filter content field of known event kinds
 * kindnumber : a number representing a specific event kind 
 */
export class GrapevineRating<Type = string | kindnumber> {
  constructor(
    public score : RatableScore<RatableClass<Type>>,
    // public confidence : percent = 100,
    readonly rater? : pubkey,
    readonly ratee? : RatableUid<RatableClass<Type>>,
    public context? : RatableContext<RatableClass<Type>>,
    // readonly type : Ratable<Type>,
  ){}
}
type GrapevineRatings<Types = (string | kindnumber)[]> = 
  GrapevineRating<keyof Types> | never



export class Ratable<Type> {
  constructor(
    readonly  confidence : RatableConfidence<Type>
  ){}
}
type Ratables<Types = (string | kindnumber)[]> = 
  Ratable<keyof Types> | never


type RatableClass<Type = string | kindnumber> = 
  // FIXME number strings don't work here
  Type extends '3' | '10000' ? "PubkeyList" : 
  Type extends '0' ? "Pubkey" : 
  Type extends kindnumber ? "Event" : 
  Type extends string ? "Content" : 
  never
type RatableClasses<Types = (string | kindnumber)[]> = 
RatableClass<keyof Types> | never


type RatableUid<Type> = 
  RatableClass<Type> extends "Pubkey" ? pubkey : 
  RatableClass<Type> extends "PubkeyList" ?  3 | 10000 :
  RatableClass<Type> extends string ? string : 
  never
type RatableUids<Types = (string | kindnumber)[]> = 
  RatableUid<keyof Types> | never

type RatableScore<Type> = 
  RatableClass<Type> extends "PubkeyList" ? 0 | 1 : 
  RatableClass<Type> extends string ? percent :
  never

type RatableConfidence<Type> = 
  RatableClass<Type> extends "PubkeyList" ? 0 | 1 :   
  RatableClass<Type> extends string ? percent :
  never

type RatableContext<Type> = string;

// let myfollow : GrapevineRating<"Mute"> = new GrapevineRating<"Mute">(1)

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
    readonly defaultPubkeyRating  = new GrapevineRating<'0'>(100),
    readonly followsInterperetation  = new GrapevineRating<'3'>(1),
    readonly mutesInterperetation  = new GrapevineRating<'10000'>(0),
    readonly reportsInterperetation  = new GrapevineRating<'1984'>(100),
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
export type onetofive = IntRange<1,5>
export type kindnumber = number
// export type kindnumber_replaceable = IntRange<10000,20000>