/**
 * Local brush-mask inpainting for removing a small selected annotation/mark.
 * Fills only explicitly selected pixels from boundary samples. Never detects
 * handwriting automatically, and never touches unselected text, stamps or signatures.
 */
export function inpaintMaskedPixels(rgba,mask,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width*height>7000000)throw Error('Invalid image dimensions');
 if(rgba.length!==width*height*4||mask.length!==width*height)throw Error('Invalid erase mask');
 const source=new Uint8ClampedArray(rgba),horizontal=new Uint8ClampedArray(rgba);
 const marked=i=>mask[i]>0;
 const fill=(target,index,a,b,ratio)=>{
  for(let k=0;k<3;k++)target[index*4+k]=Math.round(source[a*4+k]*(1-ratio)+source[b*4+k]*ratio);
 };
 // Horizontal interpolation between immediately visible pixels bordering each mask run.
 for(let y=0;y<height;y++){
  let x=0;while(x<width){
   if(!marked(y*width+x)){x++;continue}
   const start=x;while(x<width&&marked(y*width+x))x++;
   const left=start-1,right=x;
   if(left<0&&right>=width)continue;
   for(let t=start;t<right;t++){
    const at=y*width+t,nearL=y*width+Math.max(0,left),nearR=y*width+Math.min(width-1,right);
    const ratio=left<0?1:right>=width?0:(t-left)/(right-left);
    fill(horizontal,at,nearL,nearR,ratio);
   }
  }
 }
 const output=new Uint8ClampedArray(horizontal);
 // Mix vertical boundary samples to avoid horizontal stripes around wider brush strokes.
 for(let x=0;x<width;x++){
  let y=0;while(y<height){
   if(!marked(y*width+x)){y++;continue}
   const start=y;while(y<height&&marked(y*width+x))y++;
   const top=start-1,bottom=y;
   if(top<0&&bottom>=height)continue;
   for(let t=start;t<bottom;t++){
    const at=t*width+x,nearT=Math.max(0,top)*width+x,nearB=Math.min(height-1,bottom)*width+x;
    const ratio=top<0?1:bottom>=height?0:(t-top)/(bottom-top);
    for(let k=0;k<3;k++){
      const vertical=source[nearT*4+k]*(1-ratio)+source[nearB*4+k]*ratio;
      output[at*4+k]=Math.round((horizontal[at*4+k]+vertical)/2);
    }
   }
  }
 }
 return output;
}
