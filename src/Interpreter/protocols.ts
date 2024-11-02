// Export ALL module instances of Interpreter interface
// as this[source][protocol]

import {follows} from './Nostr/protocols/follows.ts'
import {mutes} from './Nostr/protocols/mutes.ts'
import {reports} from './Nostr/protocols/reports.ts'

export const nostr = {follows,mutes,reports}