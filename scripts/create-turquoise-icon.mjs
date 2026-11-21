/**
 * RivoScan original scanner-document icon from the 0.45.44 source tree.
 * Keep the exact approved artwork. Crop only its existing wordmark, leaving
 * the original symbol, with modest white edge padding. No new R or remote art.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import pngjs from 'pngjs';
const {PNG}=pngjs,root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_SHA256='e2e1626a748593fd71e39c00bb3826a6de16b365ecfc344e8807549ab1b4dc8f';
const source=readFileSync(join(root,'assets/branding/rivoscan-icon-source.png'));
if(createHash('sha256').update(source).digest('hex')!==SOURCE_SHA256)
 throw Error('Approved original scanner icon SHA256 mismatch: refusing replacement artwork');
const input=PNG.sync.read(source,{checkCRC:true});
if(input.width!==512||input.height!==512)throw Error('Original RivoScan icon must be 512x512');
// The source contains the original blue document/scanner mark above a wordmark.
const ICON_CROP=Object.freeze({x:58,y:7,size:394});
// Launcher uses the existing approved artwork, not a new painted logo.
// The near-white area OUTSIDE the rounded blue mark becomes alpha-transparent.
function sample(x,y,c){
 const lo=n=>Math.max(0,Math.min(511,n));
 const x0=Math.floor(lo(x)),y0=Math.floor(lo(y)),x1=lo(x0+1),y1=lo(y0+1);
 const tx=Math.max(0,Math.min(1,x-x0)),ty=Math.max(0,Math.min(1,y-y0));
 const v=(xx,yy)=>input.data[(yy*512+xx)*4+c];
 return Math.round(v(x0,y0)*(1-tx)*(1-ty)+v(x1,y0)*tx*(1-ty)+v(x0,y1)*(1-tx)*ty+v(x1,y1)*tx*ty);
}
function originalMark(visibleSize){
 const out=new PNG({width:512,height:512}),offset=Math.floor((512-visibleSize)/2);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const idx=(y*512+x)*4;
  for(let c=0;c<4;c++)out.data[idx+c]=255;
  if(x>=offset&&y>=offset&&x<offset+visibleSize&&y<offset+visibleSize){
   const sx=ICON_CROP.x+(x-offset+.5)*ICON_CROP.size/visibleSize-.5;
   const sy=ICON_CROP.y+(y-offset+.5)*ICON_CROP.size/visibleSize-.5;
   for(let c=0;c<3;c++)out.data[idx+c]=sample(sx,sy,c);
  }
 }
 return PNG.sync.write(out);
}
/* Remove ONLY the white background connected to the outer image edge.
 * The paper, scanner brackets, original blue mark, and all inner white details
 * are preserved byte-for-byte in sampled RGB; no new glyph is drawn.
 * A flood fill is safer than a global white->transparent filter (which would
 * erase the original white document graphic). */
function removeOuterWhite(bytes){
  const png=PNG.sync.read(bytes,{checkCRC:true});
  const {width:w,height:h,data}=png,seen=new Uint8Array(w*h);
  const queue=new Int32Array(w*h);let head=0,tail=0;
  const push=(n)=>{if(!seen[n]){seen[n]=1;queue[tail++]=n;}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(head<tail){
    const n=queue[head++],k=n*4;
    const r=data[k],g=data[k+1],b=data[k+2];
    // The outside is white/off-white; never traverse into the blue artwork.
    if(r<185||g<185||b<185||Math.max(r,g,b)-Math.min(r,g,b)>90)continue;
    data[k]=0;data[k+1]=0;data[k+2]=0;data[k+3]=0;
    const x=n%w,y=(n-x)/w;
    if(x)push(n-1);if(x+1<w)push(n+1);
    if(y)push(n-w);if(y+1<h)push(n+w);
  }
  return PNG.sync.write(png);
}
// No opaque white surround: the launcher owns the exterior shape.
// Keep a small 12px safety inset so the original blue symbol is never clipped.
const store=removeOuterWhite(originalMark(488));
// Adaptive foreground fits comfortably inside Android's central safe mask.
const adaptive=removeOuterWhite(originalMark(334));
// In-app header logo is deliberately unchanged by the launcher fix.
const header=originalMark(450);
const fullLogo=readFileSync(join(root,'assets/branding/rivoscan-logo-original.png'));
for(const [name,data] of [
 ['public/rivoscan-icon.png',store],
 ['public/rivoscan-store-icon.png',store],
 ['public/rivoscan-play-icon.png',store],
 ['public/rivoscan-adaptive-foreground.png',adaptive],
 ['public/rivoscan-header-mark.png',header],
 ['public/rivoscan-logo.png',fullLogo],
 ['node_modules/.cache/rivoscan/icon.png.b64',Buffer.from(store.toString('base64')+'\n')],
 ['node_modules/.cache/rivoscan/adaptive.png.b64',Buffer.from(adaptive.toString('base64')+'\n')]
]){
 const path=join(root,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);
}
console.log('[RivoScan] Original scanner-document icon with transparent launcher corners, no white surround.');
