/**
 * Offline content-based book-page flattening: align repeated ink-line rows
 * across 7 vertical page bands with bounded cross-correlation.
 * This is an image-derived 1D vertical displacement field, NOT 3D surface
 * reconstruction. Use only when enough real text rows give confidence.
 */
export function estimateLineWarp(rgba,width,height,spineSide='right'){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<140||height<120||
    width*height>3000000||rgba.length!==width*height*4||
    !['left','right'].includes(spineSide))throw Error('Invalid page image');
 const n=7,profiles=[],xs=[],low=Math.floor(height*.12),high=Math.ceil(height*.88);
 for(let j=0;j<n;j++){
  const center=(.13+.74*j/(n-1))*width,half=Math.max(5,Math.floor(width*.045));
  const x0=Math.max(0,Math.floor(center-half)),x1=Math.min(width,Math.ceil(center+half));
  const a=new Float64Array(height);xs.push(center/width);
  for(let y=low;y<high;y++){
   let dark=0,count=0;
   for(let x=x0;x<x1;x+=2){
    const at=(y*width+x)*4;
    if((rgba[at]*.2126+rgba[at+1]*.7152+rgba[at+2]*.0722)<155)dark++;
    count++;
   }
   a[y]=dark/Math.max(1,count);
  }
  let mean=0,sum=0;
  for(let y=low;y<high;y++)mean+=a[y];mean/=high-low;
  for(let y=low;y<high;y++){a[y]-=mean;sum+=a[y]*a[y]}
  profiles.push({a,variance:Math.sqrt(sum/(high-low))});
 }
 const outer=spineSide==='right'?0:n-1,reference=profiles[outer];
 if(reference.variance<.08)return {anchors:[],confidence:0};
 const maxShift=Math.min(32,Math.floor(height*.055)),anchors=[];
 for(let j=0;j<n;j++){
  if(j===outer){anchors.push({x:xs[j],shift:0});continue}
  const profile=profiles[j];
  if(profile.variance<.075)continue;
  let best=-Infinity,delta=0;
  for(let shift=-maxShift;shift<=maxShift;shift++){
   let sum=0,count=0;
   for(let y=low+maxShift;y<high-maxShift;y++){
    sum+=reference.a[y]*profile.a[y+shift];count++;
   }
   const score=sum/(Math.max(1,count)*reference.variance*profile.variance);
   if(score>best){best=score;delta=shift}
  }
  if(best>=.38)anchors.push({x:xs[j],shift:delta/height});
 }
 anchors.sort((a,b)=>a.x-b.x);
 const reliable=anchors.length>=4&&anchors.some(a=>Math.abs(a.shift)>2/height);
 const confidence=reliable?Math.min(1,Math.max(0,(anchors.length-3)/4)):.0;
 return confidence>=.25?{anchors,confidence}:{anchors:[],confidence:0};
}
export function remapLineWarpRGBA(source,width,height,warp){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||
    width*height>5000000||source.length!==width*height*4)throw Error('Invalid image');
 if(!warp||!Array.isArray(warp.anchors)||warp.anchors.length<4||
    !warp.anchors.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.shift)&&
       p.x>=0&&p.x<=1&&Math.abs(p.shift)<=.085))throw Error('Invalid line warp');
 const anchor=warp.anchors.slice().sort((a,b)=>a.x-b.x),out=new Uint8ClampedArray(source.length);
 let section=0;
 for(let x=0;x<width;x++){
  const u=x/(width-1);
  while(section<anchor.length-2&&u>anchor[section+1].x)section++;
  const a=anchor[section],b=anchor[section+1];
  const mix=Math.min(1,Math.max(0,(u-a.x)/Math.max(.0001,b.x-a.x)));
  const shift=(a.shift*(1-mix)+b.shift*mix)*height;
  for(let y=0;y<height;y++){
   const v=Math.max(0,Math.min(height-1,y+shift*Math.sin(Math.PI*y/(height-1))));
   const y0=Math.floor(v),y1=Math.min(height-1,y0+1),f=v-y0,i=(y*width+x)*4;
   const p=(y0*width+x)*4,q=(y1*width+x)*4;
   for(let k=0;k<4;k++)out[i+k]=Math.round(source[p+k]*(1-f)+source[q+k]*f);
  }
 }
 return out;
}
export function applyLineWarpCanvas(canvas,warp){
 if(!warp?.anchors?.length)return canvas;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const image=ctx.getImageData(0,0,canvas.width,canvas.height);
 image.data.set(remapLineWarpRGBA(image.data,canvas.width,canvas.height,warp));
 ctx.putImageData(image,0,0);
 return canvas;
}
