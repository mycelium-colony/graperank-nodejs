


/**
 * Handle big arrays with care
 * using a promise to wait for setTimeout
 * and using setTimeout to avoid "Maximum call size stack exceeded" error in nodejs
 * https://stackoverflow.com/questions/20936486/node-js-maximum-call-stack-size-exceeded
 */

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