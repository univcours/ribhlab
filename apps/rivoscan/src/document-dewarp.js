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
