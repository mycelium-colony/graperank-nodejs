// Export ALL module instances of Interpreter interface
// as this[source][protocol]

import { ProtocolParams, ProtocolRequest, RatingsMap, protocol, userId} from '../types'
import { DEBUGTARGET } from '../utils'
import { InterpretationProtocol, ProtocolFactory } from './classes'
import { NostrProtocolFactory } from './Nostr'


export class Protocols extends Map<string, InterpretationProtocol<ProtocolParams>> {
  constructor() {
    super()
    NostrProtocolFactory.forEach((initializer, protocol)=>{
      if(!this.has(protocol)) this.set(protocol, initializer())
    })
  }

  async setRequest(request:ProtocolRequest){
    this.get(request.protocol).request = request
  }

  getInterpreted(protocol : protocol) : RatingsMap {
    return this.get(protocol).interpreted
  }

  async fetchData(protocol:protocol, raters: Set<userId>){
    return await this.get(protocol).fetchData(raters)
  }

  async interpret(protocol : protocol, dos : number): Promise<RatingsMap>{
    let instance = this.get(protocol)
    // let numzero = 0
    let newratings = await instance.interpret(dos)
    let numtargetratings = 0
    for(let r in newratings){
      // if(newratings[r].score == 0) numzero ++
      // DEBUG
      if(newratings[r].ratee == DEBUGTARGET)
        console.log('DEBUGTARGET : interpret : rating ',numtargetratings,' returned by protocolInterpret() ', newratings[r])
    }
    // console.log("GrapeRank : interpret : "+protocol+" protocol : number of zero scored ratings = "+numzero+" of "+newratings.length+" ratings")
    return newratings
  }

}