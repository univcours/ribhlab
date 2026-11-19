/**
 * Build-safe, dependency-free RivoScan launcher icon generator.
 * The SVG and generated Android PNG use the same turquoise visual language.
 * PNG encoded locally with Node zlib; no fonts, networks or remote image APIs.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),N=512;
const pixels=new Uint8Array(N*N*4);
function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x))}
function blend(x,y,r,g,b,a=1){
 if(x<0||y<0||x>=N||y>=N||a<=0)return;
 const i=(y*N+x)*4,old=pixels[i+3]/255,newAlpha=a+old*(1-a);
 if(newAlpha<=0)return;
 for(const [k,v] of [r,g,b].entries())pixels[i+k]=Math.round((v*a+pixels[i+k]*old*(1-a))/newAlpha);
 pixels[i+3]=Math.round(newAlpha*255);
}
function rounded(x,y,l,t,r,b,rad){
 const dx=Math.max(l+rad-x,0,x-(r-rad)),dy=Math.max(t+rad-y,0,y-(b-rad));
 return Math.hypot(dx,dy)-rad;
}
function capsule(x,y,x1,y1,x2,y2,rad){
 const dx=x2-x1,dy=y2-y1,den=dx*dx+dy*dy;
 const tt=clamp(den?((x-x1)*dx+(y-y1)*dy)/den:0);
 return Math.hypot(x-(x1+tt*dx),y-(y1+tt*dy))-rad;
}
function paint(shape,rgb,opacity=1){
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  let d=shape(x+.5,y+.5);const alpha=clamp(.5-d)*opacity;
  if(alpha)blend(x,y,...rgb,alpha);
 }
}
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const d=rounded(x+.5,y+.5,0,0,512,512,108);
 if(d<=.5){
  const t=clamp((x+y)/900),glow=clamp(1-Math.hypot(x-100,y-70)/600);
  const rgb=[12+7*glow-7*t,186+23*glow-100*t,173+10*glow-82*t];
  blend(x,y,...rgb,clamp(.5-d));
 }
}
paint((x,y)=>rounded(x,y,164,128,359,403,19),[2,65,71],.3);
paint((x,y)=>rounded(x,y,161,125,356,400,18),[236,255,251]);
paint((x,y)=>Math.max(x-356,293-x,125-y,y-197),[178,241,231],.94);
for(const [x1,y1,x2,y2] of [[203,232,303,232],[203,273,319,273],[203,315,312,315],[203,353,279,353]])
 paint((x,y)=>capsule(x,y,x1,y1,x2,y2,8),[14,144,150],.85);
for(const [x1,y1,x2,y2] of [
 [96,177,96,128],[96,128,128,97],[128,97,176,97],
 [335,97,384,97],[384,97,416,128],[416,128,416,177],
 [96,335,96,384],[96,384,128,415],[128,415,176,415],
 [335,415,384,415],[384,415,416,384],[416,384,416,335]
 ])paint((x,y)=>capsule(x,y,x1,y1,x2,y2,10),[227,255,248]);
paint((x,y)=>capsule(x,y,118,311,394,311,12),[74,253,229],.34);
paint((x,y)=>capsule(x,y,112,311,400,311,3.7),[228,255,254]);
function crc32(buf){
 let crc=0xffffffff;
 for(const byte of buf){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^(0xedb88320&-(crc&1));}
 return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
 const name=Buffer.from(type),size=Buffer.alloc(4),checksum=Buffer.alloc(4);
 size.writeUInt32BE(data.length);
 checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));
 return Buffer.concat([size,name,data,checksum]);
}
const raw=Buffer.alloc(N*(N*4+1));
for(let y=0;y<N;y++)Buffer.from(pixels.subarray(y*N*4,(y+1)*N*4)).copy(raw,y*(N*4+1)+1);
const header=Buffer.alloc(13);header.writeUInt32BE(N,0);header.writeUInt32BE(N,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
// Generated assets live under already-ignored node_modules: never dirty Git
// and never block the next safe git pull on a user's Windows PC.
for(const [p,data] of [['node_modules/.cache/rivoscan/icon.png.b64',png.toString('base64')+'\n']]){
 const abs=join(root,p);mkdirSync(dirname(abs),{recursive:true});writeFileSync(abs,data);
}
console.log('[RivoScan] Turquoise icon generated: '+png.length+' bytes; web and Android assets aligned.');
