export type pubkey = string
export type signature = string

/**
 * All data collected from Nostr relating to a collection of pubkeys
 */
export type NostrUserCache = Record<
  pubkey, {
    readonly follows : pubkey[],
    readonly followedBy : pubkey[],
    readonly mutes : pubkey[],
    readonly mutedBy : pubkey[],
    readonly reports : pubkey[],
    readonly reportedBy : pubkey[],
    // ...
  }>