import {StorageProcessor, StorageParams } from "../types"
import { s3Processor } from "./s3";

export namespace StorageProcessors {
  export const s3 = s3Processor
}

export class Storage {

  static init(config: StorageParams) : StorageProcessor {
    if (typeof config.processor == 'string' && !StorageProcessors[config.processor]) 
      throw('GrapeRank : Storage : ERROR invalid storage processor provided.')

    let processor : StorageProcessor = typeof config.processor == 'string'
      ? new StorageProcessors[config.processor](config.config)
      : config.processor;
    
    return processor
  }
}
