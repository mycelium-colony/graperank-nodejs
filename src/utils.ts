


/**
 * Handle big arrays with care
 * using a promise to wait for setTimeout
 * and using setTimeout to avoid "Maximum call size stack exceeded" error in nodejs
 * https://stackoverflow.com/questions/20936486/node-js-maximum-call-stack-size-exceeded
 */

export async function filterBigArray<T>(bigarray : T[], predicate: (value: T, index: number, array: T[]) => unknown, thisArg? : any, max = 1000) : Promise<T[]>{
  const filtered : T[] = []
  const slices = await sliceBigArray<T>(bigarray, max)
  for(let s in slices){ 
    filtered.push( 
      ... await new Promise<T[]>( (resolve) => {
        setTimeout( () => { resolve(
          slices[s].filter(predicate,thisArg)
        )}, 0 )
      })
    )
  }
  return filtered
}

export async function forEachBigArray<T>(bigarray : T[], callbackfn : (value: T, index: number, array: T[]) => void, thisArg? : any, max = 1000) : Promise<void>{
  const slices = await sliceBigArray<T>(bigarray, max)
  for(let s in slices){ 
    await new Promise<void>( (resolve) => {
      setTimeout( () => { resolve(
        slices[s].forEach(callbackfn,thisArg)
      )}, 0 )
    })
  }
  return 
}

export async function mergeBigArrays<T>(array1 : T[], array2 : T[], max = 1000) : Promise<T[]>{
  const merged : T[] = [...array1]
  const slices = await sliceBigArray<T>(array2, max)
  for(let s in slices){ 
    merged.push(
      ... await new Promise<T[]>( (resolve) => {
        setTimeout( () => { 
          resolve(slices[s]) 
        }, 0 )
      })
    )
  }
  return merged
}

export async function sliceBigArray<T>(array : T[], max = 1000) : Promise<T[][]>{
  if(array.length <= max ) return [array]
  let sliced : T[][] = []
  let slicestart = 0
  let sliceend = max
  while(slicestart < array.length){
    sliced.push(await new Promise<T[]>( (resolve) => {
      setTimeout( () => { 
        resolve(array.slice(slicestart,sliceend)) 
      }, 0 )
    }))
    slicestart = sliceend
    sliceend = slicestart+max
  }
  return sliced
}




export function mapNested<Index1, Index2, Value>(array : [Index1,[Index2,Value][]][]) :  Map<Index1,Map<Index2,Value>> {
  let map : Map<Index1,Map<Index2,Value>> = new Map()
  for(let i in array){
    map.set(array[i][0], new Map(array[i][1]))
  }
  return map
}
export function unmapNested<Index1, Index2, Value>(map : Map<Index1,Map<Index2,Value>> ) : [Index1,[Index2,Value][]][] {
  let array : [Index1,[Index2,Value][]][] = []
  map.forEach((value,key)=>{
    array.push([key, [...value.entries()]])
  })
  return array
}