/**
 * Locally varying book/document dewarp from OCR-like ink-line structure.
 * Each horizontal page band independently cross-correlates printed line
 * profiles across seven vertical strips. A conservative confidence gate
 * prevents transformations on blank, photo-only or ambiguous pages.
 * This estimates a 2D pixel-remap field; it is NOT 3D depth reconstruction.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function estimateTextGridWarp(rgba,width,height,spineSide='right'){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<220||height<240||
  width*height>3000000||rgba.length!==width*height*4||!['left','right'].includes(spineSide))
  throw Error('Invalid document photo');
 const xs=[.12,.25,.38,.50,.62,.75,.88],ys=[.22,.37,.52,.67,.82];
 const profiles=xs.map(xFrac=>{
  const data=new Float32Array(height);
  const center=Math.round(xFrac*(width-1));
  const margin=Math.max(6,Math.round(width*.042));
  for(let y=0;y<height;y++){
   let dark=0,seen=0;
   for(let x=Math.max(0,center-margin);x<Math.min(width,center+margin);x+=2){
    const at=(y*width+x)*4;
    if(.2126*rgba[at]+.7152*rgba[at+1]+.0722*rgba[at+2]<163)dark++;
    seen++;
   }
   data[y]=dark/Math.max(1,seen);
  }
  return data;
 });
 const reference=spineSide==='right'?0:xs.length-1;
 const maximumShift=Math.min(32,Math.floor(height*.065)),rows=[],scores=[];
 for(const cy of ys){
  const y0=Math.round((cy-.102)*height),y1=Math.round((cy+.102)*height),n=y1-y0;
  const a=profiles[reference];let aa=0,a2=0;
  for(let y=y0;y<y1;y++){aa+=a[y];a2+=a[y]*a[y];}
  const varA=a2-aa*aa/n;
  if(varA/n<.003)continue;
  const anchors=[{x:xs[reference],shift:0}],reliability=[];
  for(let col=0;col<xs.length;col++){
   if(col===reference)continue;
   const b=profiles[col];let best=-2,bestShift=0;
   for(let shift=-maximumShift;shift<=maximumShift;shift++){
    let ab=0,bb=0,b2=0;
    for(let y=y0;y<y1;y++){
     const val=b[y+shift];bb+=val;b2+=val*val;ab+=a[y]*val;
    }
    const varB=b2-bb*bb/n;
    if(varB/n<.002)continue;
    const corr=(ab-aa*bb/n)/Math.sqrt(Math.max(1e-9,varA*varB));
    if(corr>best+.001||(Math.abs(corr-best)<=.001&&Math.abs(shift)<Math.abs(bestShift))){
     best=corr;bestShift=shift;
    }
   }
   if(best>=.58){
    anchors.push({x:xs[col],shift:bestShift/height});
    reliability.push(best);
   }
  }
  anchors.sort((a,b)=>a.x-b.x);
  if(anchors.length>=4){
   rows.push({y:cy,anchors});
   scores.push(reliability.reduce((a,b)=>a+b,0)/reliability.length);
  }
 }
 const moved=rows.reduce((n,row)=>n+row.anchors.filter(p=>Math.abs(p.shift)>2/height).length,0);
 if(rows.length<2||moved<3)return {rows:[],confidence:0};
 const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
 const confidence=clamp((avg-.49)*1.8*(rows.length/ys.length),0,1);
 return confidence>=.28?{rows,confidence}:{rows:[],confidence:0};
}
function shiftAtX(anchors,u){
 let p=0;
 while(p<anchors.length-2&&u>anchors[p+1].x)p++;
 const a=anchors[p],b=anchors[p+1];
 const f=clamp((u-a.x)/Math.max(.0001,b.x-a.x),0,1);
 return a.shift*(1-f)+b.shift*f;
}
export function remapTextGridRGBA(source,width,height,warp){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||
   width*height>5000000||source.length!==width*height*4)throw Error('Invalid pixels');
 const rows=warp?.rows;
 if(!Array.isArray(rows)||rows.length<2||rows.length>7||
   !rows.every(r=>Number.isFinite(r.y)&&r.y>=0&&r.y<=1&&
     Array.isArray(r.anchors)&&r.anchors.length>=4&&r.anchors.length<=7&&
     r.anchors.every(a=>Number.isFinite(a.x)&&a.x>=0&&a.x<=1&&
       Number.isFinite(a.shift)&&Math.abs(a.shift)<=.09)))
   throw Error('Invalid text warp');
 const sorted=rows.slice().sort((a,b)=>a.y-b.y);
 const out=new Uint8ClampedArray(source.length);
 for(let x=0;x<width;x++){
  const u=x/(width-1);
  const shifts=sorted.map(row=>shiftAtX(row.anchors,u)*height);
  let r=0;
  for(let y=0;y<height;y++){
   const v=y/(height-1);
   while(r<sorted.length-2&&v>sorted[r+1].y)r++;
   const lo=sorted[r],hi=sorted[r+1];
   const f=clamp((v-lo.y)/Math.max(.0001,hi.y-lo.y),0,1);
   const taper=clamp(Math.min(y,(height-1-y))/(height*.09),0,1);
   const shift=(shifts[r]*(1-f)+shifts[r+1]*f)*taper;
   const srcY=clamp(y+shift,0,height-1),base=Math.floor(srcY),next=Math.min(height-1,base+1),frac=srcY-base;
   const i=(y*width+x)*4,j=(base*width+x)*4,k=(next*width+x)*4;
   for(let color=0;color<4;color++)out[i+color]=Math.round(source[j+color]*(1-frac)+source[k+color]*frac);
  }
 }
 return out;
}
export function applyTextGridCanvas(canvas,warp){
 if(!warp?.rows?.length)return canvas;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const original=ctx.getImageData(0,0,canvas.width,canvas.height);
 original.data.set(remapTextGridRGBA(original.data,canvas.width,canvas.height,warp));
 ctx.putImageData(original,0,0);return canvas;
}
