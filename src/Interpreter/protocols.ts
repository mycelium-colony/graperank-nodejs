// Export ALL module instances of Interpreter interface
// as this[source][protocol]

import {follows} from './Nostr/protocols/follows'
import {mutes} from './Nostr/protocols/mutes'
import {reports} from './Nostr/protocols/reports'

export const nostr = {follows,mutes,reports}