/** Detect a repeated dark book gutter across image height; manual override always remains. */
export function estimateBookSpine(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<160||height<100||
 width*height>3000000||rgba.length!==width*height*4)throw Error('Invalid book photo');
 const xmin=Math.floor(width*.32),xmax=Math.ceil(width*.68),bands=8;
 const p=Array.from({length:bands},()=>new Float64Array(width));
 const counts=new Uint32Array(bands);
 const ymin=Math.floor(height*.1),ymax=Math.ceil(height*.9);
 for(let y=ymin;y<ymax;y+=3){
  const band=Math.min(bands-1,Math.floor((y-ymin)*bands/(ymax-ymin)));counts[band]++;
  for(let x=xmin;x<xmax;x++){
   const i=(y*width+x)*4;p[band][x]+=.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2];
  }
 }
 const all=new Float64Array(width);
 for(let x=xmin;x<xmax;x++)for(let b=0;b<bands;b++)all[x]+=p[b][x]/Math.max(1,counts[b])/bands;
 const rad=Math.max(2,Math.round(width*.009));
 const avg=(a,x)=>{let total=0,n=0;for(let i=x-rad;i<=x+rad;i++){if(i>=xmin&&i<xmax){total+=a[i];n++}}return total/Math.max(n,1)};
 let center=Math.round(width*.5),best=Infinity;
 for(let x=Math.max(xmin+rad,Math.round(width*.35));x<=Math.min(xmax-rad,Math.round(width*.65));x++){
  const value=avg(all,x);if(value<best){best=value;center=x}
 }
 const off=Math.round(width*.095),left=Math.max(xmin+rad,center-off),right=Math.min(xmax-rad,center+off);
 const contrast=Math.min(avg(all,left),avg(all,right))-best;
 let consistent=0;
 for(let b=0;b<bands;b++){
  const centerShade=avg(p[b],center)/Math.max(counts[b],1);
  const sides=Math.min(avg(p[b],left),avg(p[b],right))/Math.max(counts[b],1);
  if(sides-centerShade>10)consistent++;
 }
 const confidence=Math.min(1,Math.max(0,(contrast-10)/60))*consistent/bands;
 if(confidence<.25)return {spine:50,confidence:0};
 return {spine:Math.max(25,Math.min(75,Math.round(center*100/width))),confidence};
}
