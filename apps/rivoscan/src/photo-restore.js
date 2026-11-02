/**
 * Offline, edge-aware RGB denoiser. A conservative 3x3 neighborhood smooths
 * isolated sensor noise without mixing strongly different ink/stamp colors.
 * It cannot reconstruct missing pixels or repair deep physical damage.
 */
export function restorePhotoPixels(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width*height>7000000||rgba.length!==width*height*4)throw Error('Invalid image');
 const output=new Uint8ClampedArray(rgba),src=new Uint8ClampedArray(rgba);
 // Fix only isolated high-contrast single-pixel dust on a locally uniform
 // neighborhood. A connected ink stroke has dark neighbors and is preserved.
 // No missing image detail is hallucinated or uploaded.
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
   const center=(y*width+x)*4;
   // Fast rejection for ordinary smooth pixels and connected line strokes:
   // expensive median samples are needed only for suspicious isolated spots.
   let similar=0;
   for(const at of [center-width*4,center+width*4,center-4,center+4]){
     const delta=Math.abs(src[at]-src[center])+
       Math.abs(src[at+1]-src[center+1])+Math.abs(src[at+2]-src[center+2]);
     if(delta<75&&++similar===2)break;
   }
   if(similar>=2)continue;
   const samples=[];
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     if(dx===0&&dy===0)continue;
     const at=((y+dy)*width+x+dx)*4;
     samples.push([src[at],src[at+1],src[at+2]]);
   }
   const med=[0,1,2].map(k=>samples.map(c=>c[k]).sort((a,b)=>a-b)[3]);
   const noise=Math.max(...[0,1,2].map(k=>Math.abs(src[center+k]-med[k])));
   const support=samples.filter(c=>c.every((v,k)=>Math.abs(v-med[k])<25)).length;
   if(noise>100&&support===8){
     for(let k=0;k<3;k++)output[center+k]=med[k];
   }
 }
 // Subsequent smoothing uses repaired data but never changes alpha or input.
 src.set(output);
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
