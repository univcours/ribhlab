/**
 * Offline, edge-aware RGB denoiser. A conservative 3x3 neighborhood smooths
 * isolated sensor noise without mixing strongly different ink/stamp colors.
 * It cannot reconstruct missing pixels or repair deep physical damage.
 */
export function restorePhotoPixels(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width*height>7000000||rgba.length!==width*height*4)throw Error('Invalid image');
 const output=new Uint8ClampedArray(rgba),src=new Uint8ClampedArray(rgba);
 for(let y=1;y<height-1;y++){
  for(let x=1;x<width-1;x++){
   const i=(y*width+x)*4,r=src[i],g=src[i+1],b=src[i+2];
   let sumR=0,sumG=0,sumB=0,total=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const o=((y+dy)*width+x+dx)*4;
    const distance=Math.abs(src[o]-r)+Math.abs(src[o+1]-g)+Math.abs(src[o+2]-b);
    if(distance>88&&(dx!==0||dy!==0))continue;
    const weight=dx===0&&dy===0?5:(dx===0||dy===0?2:1);
    sumR+=src[o]*weight;sumG+=src[o+1]*weight;sumB+=src[o+2]*weight;total+=weight;
   }
   if(total>0){output[i]=Math.round(sumR/total);output[i+1]=Math.round(sumG/total);output[i+2]=Math.round(sumB/total)}
  }
 }
 return output;
}
