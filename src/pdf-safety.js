/** Limit decoded bitmap sizes before allocating canvas memory on Android. */
export function safePdfRenderScale(width,height,requested=1.5,{maxPixels=9_000_000,maxSide=4096}={}){
 if(![width,height,requested,maxPixels,maxSide].every(Number.isFinite)||
    width<=0||height<=0||requested<=0||maxPixels<1||maxSide<1)
  throw Error('Invalid PDF dimensions or rendering scale');
 const bounded=Math.min(requested,maxSide/Math.max(width,height),
  Math.sqrt(maxPixels/(width*height)));
 if(!Number.isFinite(bounded)||bounded<=0)throw Error('PDF page cannot be safely rendered');
 return bounded;
}
