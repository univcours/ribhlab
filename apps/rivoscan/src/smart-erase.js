/**
 * Explicit brush-mask inpainting (offline). Combines horizontal and vertical
 * unmasked edge samples, preferring the direction with more similar boundary
 * colors; this avoids pulling nearby black printed strokes through an erased
 * blue/red mark. Unselected RGBA bytes are never modified.
 *
 * This is deterministic local repair, NOT generative or semantic object removal.
 */
export function inpaintMaskedPixels(rgba,mask,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
   width*height>7000000)throw Error('Invalid image dimensions');
 if(rgba.length!==width*height*4||mask.length!==width*height)throw Error('Invalid erase mask');
 const source=new Uint8ClampedArray(rgba),output=new Uint8ClampedArray(rgba);
 const pixelCount=width*height,hColor=new Uint8ClampedArray(pixelCount*3),hWeight=new Uint8Array(pixelCount);
 const masked=i=>mask[i]!==0;
 const gradient=(a,b)=>{
  const p=a*4,q=b*4;
  return Math.abs(source[p]-source[q])+Math.abs(source[p+1]-source[q+1])+Math.abs(source[p+2]-source[q+2]);
 };
 const confidence=(a,b,oneSided)=>oneSided?34:Math.max(12,Math.round(255*36/(36+gradient(a,b))));
 // Horizontal independent samples: never interpolate through another masked pixel.
 for(let y=0;y<height;y++){
  let x=0;
  while(x<width){
   const start=x;
   if(!masked(y*width+x)){x++;continue}
   while(x<width&&masked(y*width+x))x++;
   const left=start-1,right=x;
   if(left<0&&right>=width)continue;
   const l=y*width+Math.max(0,left),r=y*width+Math.min(width-1,right);
   const weight=confidence(l,r,left<0||right>=width);
   for(let t=start;t<right;t++){
    const i=y*width+t,ratio=left<0?1:right>=width?0:(t-left)/(right-left);
    hWeight[i]=weight;
    for(let k=0;k<3;k++)hColor[i*3+k]=Math.round(source[l*4+k]*(1-ratio)+source[r*4+k]*ratio);
   }
  }
 }
 // Vertical independent samples and gradient-weighted directional fusion.
 for(let x=0;x<width;x++){
  let y=0;
  while(y<height){
   if(!masked(y*width+x)){y++;continue}
   const start=y;
   while(y<height&&masked(y*width+x))y++;
   const top=start-1,bottom=y,verticalValid=top>=0||bottom<height;
   const t=Math.max(0,top)*width+x,b=Math.min(height-1,bottom)*width+x;
   const vw=verticalValid?confidence(t,b,top<0||bottom>=height):0;
   for(let row=start;row<bottom;row++){
    const i=row*width+x,hw=hWeight[i],sum=hw+vw;
    if(!sum)continue; // fully selected frame has no known pixels to reconstruct.
    const ratio=top<0?1:bottom>=height?0:(row-top)/(bottom-top);
    for(let k=0;k<3;k++){
     const vertical=source[t*4+k]*(1-ratio)+source[b*4+k]*ratio;
     output[i*4+k]=Math.round((hColor[i*3+k]*hw+vertical*vw)/sum);
    }
   }
  }
 }
 return output;
}
