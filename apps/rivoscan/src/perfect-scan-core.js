/**
 * RivoScan PerfectScan: fully local pixel alignment, shadow-clean and provenance.
 * This is a conservative 2D image processor, NOT 3D surface reconstruction.
 * The original photo remains untouched; no pixels are reconstructed by AI.
 */
import {reducePaperCreasesRGBA} from './crease-reduce.js';
import {estimateTextGridWarp,remapTextGridRGBA} from './text-grid-dewarp.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const light=(rgba,i)=>.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2];
const valid=(data,w,h)=>Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&w*h<=5200000&&data?.length===w*h*4;
export function signedInkMask(rgba,width,height){
 if(!valid(rgba,width,height))throw Error('Invalid document bitmap');
 const mask=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const k=y*width+x,p=k*4,r=rgba[p],g=rgba[p+1],b=rgba[p+2],l=light(rgba,p);
  const saturation=(Math.max(r,g,b)-Math.min(r,g,b))/Math.max(40,Math.max(r,g,b));
  const xl=Math.max(0,x-1),xr=Math.min(width-1,x+1),yt=Math.max(0,y-1),yb=Math.min(height-1,y+1);
  const gradient=Math.abs(light(rgba,(y*width+xr)*4)-light(rgba,(y*width+xl)*4))+
    Math.abs(light(rgba,(yb*width+x)*4)-light(rgba,(yt*width+x)*4));
  // Keep original seals, signature lines, writing and edges. Shadow pixels
  // away from ink are eligible for conservative cleanup.
  if(l<108||saturation>.15||(l<205&&gradient>38))mask[k]=1;
 }
 return mask;
}

function grad(img,w,x,y){
 const a=((y*w+x+1)*4),b=((y*w+x-1)*4),c=(((y+1)*w+x)*4),d=(((y-1)*w+x)*4);
 return [light(img,a)-light(img,b),light(img,c)-light(img,d)];
}
export function estimateDocumentShift(ref,frame,width,height,{maxShift=22}={}){
 if(!valid(ref,width,height)||!valid(frame,width,height)||maxShift<0||maxShift>32)throw Error('Invalid alignment input');
 const step=Math.max(5,Math.ceil(Math.min(width,height)/64));
 const border=Math.max(4,maxShift+4);
 const coords=[];
 for(let y=border;y<height-border;y+=step)for(let x=border;x<width-border;x+=step){
  const [a,b]=grad(ref,width,x,y);
  if(a*a+b*b>260)coords.push([x,y,a,b]);
 }
 if(coords.length<30)return {dx:0,dy:0,confidence:0,reason:'Insufficient text/edges'};
 function score(dx,dy){
  let dot=0,ar=0,br=0;
  for(let k=0;k<coords.length;k++){
   const [x,y,a,b]=coords[k],p=grad(frame,width,x+dx,y+dy);
   dot+=a*p[0]+b*p[1];ar+=a*a+b*b;br+=p[0]*p[0]+p[1]*p[1];
  }
  return dot/Math.sqrt(Math.max(1,ar*br));
 }
 let best=-Infinity,dx=0,dy=0;
 for(let y=-maxShift;y<=maxShift;y+=2)for(let x=-maxShift;x<=maxShift;x+=2){
  const v=score(x,y);
  if(v>best){best=v;dx=x;dy=y;}
 }
 for(let y=Math.max(-maxShift,dy-2);y<=Math.min(maxShift,dy+2);y++)
  for(let x=Math.max(-maxShift,dx-2);x<=Math.min(maxShift,dx+2);x++){
   const v=score(x,y);
   if(v>best){best=v;dx=x;dy=y;}
  }
 const confidence=clamp((best-.40)/.58,0,1);
 return {dx,dy,confidence,reason:confidence>=.68?'Aligned':'Different page or insufficient alignment'};
}

export function fuseDocumentFramesRGBA(reference,width,height,others=[]){
 if(!valid(reference,width,height)||!Array.isArray(others)||others.length>3)throw Error('Invalid fusion input');
 const original=new Uint8ClampedArray(reference),out=original.slice(),protectedMask=signedInkMask(original,width,height);
 const accepted=[],rejected=[];
 for(const input of others){
  if(!input||!valid(input.data,width,height)){rejected.push('Invalid image dimensions');continue}
  const shift=estimateDocumentShift(original,input.data,width,height);
  if(shift.confidence<.68){rejected.push(shift.reason);continue}
  accepted.push({data:input.data,dx:shift.dx,dy:shift.dy,confidence:shift.confidence});
 }
 if(!accepted.length)return {pixels:out,used:0,rejected,alignments:[],protectedMask};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=i*4;
  if(protectedMask[i])continue;
  // Paper-only fusion: reject inconsistent text, features or severe shadows.
  const lum=light(original,p);
  if(lum<158)continue;
  const picks=[original[p],original[p+1],original[p+2]];
  let sumR=0,sumG=0,sumB=0,count=0;
  for(const f of accepted){
   const xx=x+f.dx,yy=y+f.dy;
   if(xx<0||yy<0||xx>=width||yy>=height)continue;
   const j=(yy*width+xx)*4,v=light(f.data,j);
   const contrast=(Math.max(f.data[j],f.data[j+1],f.data[j+2])-Math.min(f.data[j],f.data[j+1],f.data[j+2]))/Math.max(40,v);
   if(contrast>.15||Math.abs(v-lum)>92||v<140)continue;
   sumR+=f.data[j];sumG+=f.data[j+1];sumB+=f.data[j+2];count++;
  }
  if(!count)continue;
  // Choose the brighter smooth-paper estimate to remove fold shadows, but
  // keep spatially significant marks unchanged via the original ink mask.
  const mix=[sumR/count,sumG/count,sumB/count];
  const gain=Math.min(1,Math.max(0,(lum-150)/68))*.76;
  for(let c=0;c<3;c++)out[p+c]=Math.round(original[p+c]+Math.max(0,mix[c]-original[p+c])*gain);
 }
 return {pixels:out,used:accepted.length,rejected,alignments:accepted.map(({dx,dy,confidence})=>({dx,dy,confidence})),protectedMask};
}

export function inspectInkChanges(before,after,width,height){
 if(!valid(before,width,height)||!valid(after,width,height))throw Error('Invalid integrity bitmap');
 const ink=signedInkMask(before,width,height);let total=0,changed=0,severe=0,colored=0,colorChanged=0;
 for(let i=0;i<ink.length;i++)if(ink[i]){
  total++;const p=i*4;
  const delta=Math.max(Math.abs(before[p]-after[p]),Math.abs(before[p+1]-after[p+1]),Math.abs(before[p+2]-after[p+2]));
  if(delta>24)changed++;if(delta>60)severe++;
  const r=before[p],g=before[p+1],b=before[p+2];
  if(Math.max(r,g,b)-Math.min(r,g,b)>38){colored++;if(delta>24)colorChanged++;}
 }
 return {
  pixels:total,changed,severe,colored,colorChanged,
  changedPercent:total?Math.round(changed/total*10000)/100:0,
  warning:severe>Math.max(8,total*.005)||colorChanged>Math.max(5,colored*.01)
 };
}

export function perfectScanRGBA(source,width,height,{extraFrames=[],creaseStrength=80,geometry=true}={}){
 if(!valid(source,width,height))throw Error('Invalid PerfectScan image');
 if(!Number.isFinite(creaseStrength)||creaseStrength<0||creaseStrength>100)throw Error('Invalid cleaning strength');
 const first=new Uint8ClampedArray(source);
 const fusion=fuseDocumentFramesRGBA(first,width,height,extraFrames);
 let pixels=reducePaperCreasesRGBA(fusion.pixels,width,height,{strength:creaseStrength});
 let geometryApplied=false,geometryConfidence=0;
 if(geometry&&creaseStrength>=30&&width>=220&&height>=240&&width*height<=3000000){
  const candidates=['left','right'].map(side=>estimateTextGridWarp(first,width,height,side));
  const best=candidates.sort((a,b)=>b.confidence-a.confidence)[0];
  geometryConfidence=best.confidence;
  if(best.confidence>=.56){
   const gain=clamp(creaseStrength/80,0,1);
   const scaled={...best,rows:best.rows.map(row=>({
    ...row,anchors:row.anchors.map(anchor=>({...anchor,shift:anchor.shift*gain}))
   }))};
   pixels=remapTextGridRGBA(pixels,width,height,scaled);
   geometryApplied=true;
  }
 }
 const integrity=inspectInkChanges(first,pixels,width,height);
 return {
  pixels,usedFrames:fusion.used,rejectedFrames:fusion.rejected,
  alignment:fusion.alignments,geometryApplied,geometryConfidence,
  integrity,requiresReview:geometryApplied||integrity.warning
 };
}
