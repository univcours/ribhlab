/**
 * Guided NON-RIGID book-page rectification. Corrects systematic line bending
 * towards the book gutter with a continuous, non-affine vertical remap.
 * The user must adjust curvature to a visible straight text line; this is
 * not automatic 3D page reconstruction from a single photo.
 */
export function remapCurvedPageRGBA(source,width,height,curvature=0,spineSide='right'){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||
    width*height>5000000||source.length!==width*height*4)throw Error('Invalid book page');
 if(!Number.isFinite(curvature)||Math.abs(curvature)>100||!['left','right'].includes(spineSide))
  throw Error('Invalid curvature correction');
 if(curvature===0)return new Uint8ClampedArray(source);
 const target=new Uint8ClampedArray(source.length);
 const strength=curvature/100*height*.14;
 const inv=1/Math.max(1,width-1);
 const invY=1/Math.max(1,height-1);
 for(let x=0;x<width;x++){
  const u=x*inv;
  const proximity=spineSide==='left'?(1-u)*(1-u):u*u;
  for(let y=0;y<height;y++){
   const ySource=Math.max(0,Math.min(height-1,y+strength*proximity*Math.sin(Math.PI*y*invY)));
   const y0=Math.floor(ySource),y1=Math.min(height-1,y0+1),frac=ySource-y0;
   const at=(y*width+x)*4,source0=(y0*width+x)*4,source1=(y1*width+x)*4;
   for(let k=0;k<4;k++)target[at+k]=Math.round(source[source0+k]*(1-frac)+source[source1+k]*frac);
  }
 }
 return target;
}
export function dewarpBookCanvas(canvas,curvature,spineSide){
 if(curvature===0)return canvas;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const source=ctx.getImageData(0,0,canvas.width,canvas.height);
 source.data.set(remapCurvedPageRGBA(source.data,canvas.width,canvas.height,curvature,spineSide));
 ctx.putImageData(source,0,0);
 return canvas;
}

/**
 * Heuristic text-line curvature estimator for an already cropped book page.
 * It compares horizontal ink-density profiles away from and near the spine,
 * then estimates a bounded vertical bend. For low-text/low-contrast pages
 * confidence is zero and the user can still adjust manually.
 */
export function estimateBookCurvature(rgba,width,height,spineSide='right'){
 if(!['left','right'].includes(spineSide)||!Number.isInteger(width)||!Number.isInteger(height)||
    width<80||height<100||width*height>3000000||rgba.length!==width*height*4)
  throw Error('Invalid book-page sample');
 const strips=spineSide==='right'?[[.10,.34],[.66,.91]]:[[.66,.91],[.10,.34]];
 const bands=strips.map(([a,b])=>{
  const x0=Math.max(0,Math.floor(width*a)),x1=Math.min(width,Math.ceil(width*b)),out=new Float64Array(height);
  for(let y=0;y<height;y++){
   let dark=0,total=0;
   for(let x=x0;x<x1;x+=2){
    const at=(y*width+x)*4;
    const lum=.2126*rgba[at]+.7152*rgba[at+1]+.0722*rgba[at+2];
    if(lum<155)dark++;total++;
   }
   out[y]=dark/Math.max(1,total);
  }
  return out;
 });
 const low=Math.floor(height*.16),high=Math.ceil(height*.84);
 const normalize=profile=>{
  let mean=0,variance=0,count=0;
  for(let y=low;y<high;y++){mean+=profile[y];count++}
  mean/=Math.max(1,count);
  for(let y=low;y<high;y++)variance+=(profile[y]-mean)**2;
  variance=Math.sqrt(variance/Math.max(1,count));
  return {data:profile.map(x=>variance>1e-6?(x-mean)/variance:0),variance};
 };
 const A=normalize(bands[0]),B=normalize(bands[1]);
 if(A.variance<.05||B.variance<.05)return {curvature:0,confidence:0};
 let best=-Infinity,shift=0;
 const range=Math.min(25,Math.floor(height*.08));
 for(let delta=-range;delta<=range;delta++){
  let score=0,samples=0;
  for(let y=low;y<high;y++){
   const q=y+delta;
   if(q<low||q>=high)continue;
   score+=A.data[y]*B.data[q];samples++;
  }
  const normalized=score/Math.max(1,samples);
  if(normalized>best){best=normalized;shift=delta}
 }
 const confidence=Math.max(0,Math.min(1,(best-.18)/.55));
 if(confidence<.24)return {curvature:0,confidence};
 const curvature=Math.max(-100,Math.min(100,Math.round(shift/(height*.14*.67)*100)));
 return {curvature,confidence};
}
