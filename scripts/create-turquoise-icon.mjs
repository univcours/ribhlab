/**
 * RivoScan 0.45.26 launcher redesign. Owner-approved neon R WITHOUT A WORDMARK.
 * Play icon and Android adaptive foreground are deliberately separate:
 * Play is edge-to-edge opaque; Android's adaptive foreground has mask-safe art.
 * The public original is integrity-pinned and never changed without review.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import pngjs from 'pngjs';
const {PNG}=pngjs,root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_URL='https://gcdn.picsart.com/picsart-mcp/021823ce-b0f5-43fb-af2b-aecf0242a442.png';
const SOURCE_SHA256='7b752cb1cac38681bc47a100a55182214c4e385b2056a43b207134da3067f9c7';
const KEEP_COMPATIBILITY_REFERENCE='assets/branding/rivoscan-icon-source.png';
// File is delivered by our media host. SHA256 protects from silent replacement.
async function fetchImage(){
 let err;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(SOURCE_URL,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Image host HTTP '+response.status);
   const data=Buffer.from(await response.arrayBuffer());
   const hash=createHash('sha256').update(data).digest('hex');
   if(hash!==SOURCE_SHA256)throw Error('Approved icon SHA256 changed');
   return PNG.sync.read(data,{checkCRC:true});
  }catch(e){err=e;await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1000));}
 }
 throw err;
}
const original=await fetchImage();
if(original.width!==1254||original.height!==1254)throw Error('Wrong approved logo dimensions');
// This is NOT the older full-wordmark icon. The word "RivoScan" is intentionally absent.
const sizes={play:504,adaptive:360,header:456};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function bg(x,y){
 const q=clamp((x+y*.28)/650,0,1);
 return [Math.round(4+5*q),Math.round(41+100*q),Math.round(168+69*q)];
}
function logoPixel(x,y){
 const crop=18,size=1218;
 const px=clamp(Math.round(crop+x*size),0,1253),py=clamp(Math.round(crop+y*size),0,1253);
 const k=(py*original.width+px)*4;
 const r=original.data[k],g=original.data[k+1],b=original.data[k+2];
 return {r,g,b,alpha:original.data[k+3]/255};
}
function output(scale,opaque=true){
 const icon=new PNG({width:512,height:512});
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const k=(y*512+x)*4;
  const backdrop=bg(x,y);
  icon.data[k]=backdrop[0];icon.data[k+1]=backdrop[1];icon.data[k+2]=backdrop[2];icon.data[k+3]=255;
  const edge=(512-scale)/2;
  if(x<edge||y<edge||x>=512-edge||y>=512-edge)continue;
  const src=logoPixel((x-edge)/scale,(y-edge)/scale);
  // Replace the former BLACK transparent-corner matte with full-bleed blue.
  const luminance=Math.max(src.r,src.g,src.b);
  const blend=clamp((luminance-23)/32,0,1)*src.alpha;
  for(let c=0;c<3;c++)icon.data[k+c]=Math.round([src.r,src.g,src.b][c]*blend+backdrop[c]*(1-blend));
 }
 return PNG.sync.write(icon);
}
const play=output(sizes.play),adaptive=output(sizes.adaptive),header=output(sizes.header);
for(const [name,buffer] of [
 ['public/rivoscan-icon.png',play],
 ['public/rivoscan-play-icon.png',play],
 ['public/rivoscan-adaptive-foreground.png',adaptive],
 ['public/rivoscan-header-mark.png',header],
 // Keep former public logo source unmodified; screenshot texts draw "RivoScan" separately.
 ['node_modules/.cache/rivoscan/icon.png.b64',Buffer.from(play.toString('base64')+'\n')],
 ['node_modules/.cache/rivoscan/adaptive.png.b64',Buffer.from(adaptive.toString('base64')+'\n')]
]){
 const p=join(root,name);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,buffer);
}
console.log('[RivoScan] New blue R (without wordmark), mask-safe adaptive icon, edge-to-edge Google Play icon');
