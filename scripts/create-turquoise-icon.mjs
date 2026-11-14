/**
 * Keep the exact owner-approved original RivoScan images in assets/branding.
 * Launcher masks on Samsung, Pixel and other Android devices crop corner text.
 * Derive safely inset 512px resources; the source artwork is never altered.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import pngjs from 'pngjs';
const {PNG}=pngjs;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=readFileSync(join(root,'assets/branding/rivoscan-icon-adaptive-foreground.png'));
const flat=readFileSync(join(root,'assets/branding/rivoscan-icon-source.png'));
const fullLogo=readFileSync(join(root,'assets/branding/rivoscan-logo-original.png'));
for(const [name,buf,size] of [['original icon',flat,512],['adaptive image',original,512],['wordmark',fullLogo,1254]]){
 if(buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||buf.readUInt32BE(16)!==size||buf.readUInt32BE(20)!==size)
  throw Error('Incorrect approved '+name+' PNG');
}
const source=PNG.sync.read(original,{checkCRC:true});
if(source.width!==512||source.height!==512)throw Error('Incorrect launcher source size');
const output=new PNG({width:512,height:512});
const size=336,margin=(512-size)/2;
const pixel=(x,y,c)=>source.data[(Math.max(0,Math.min(511,y))*512+Math.max(0,Math.min(511,x)))*4+c];
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const u=(x+.5)*512/size-.5,v=(y+.5)*512/size-.5;
 const xa=Math.max(0,Math.floor(u)),ya=Math.max(0,Math.floor(v));
 const xb=Math.min(511,xa+1),yb=Math.min(511,ya+1);
 const tx=Math.max(0,Math.min(1,u-xa)),ty=Math.max(0,Math.min(1,v-ya));
 const dest=((y+margin)*512+(x+margin))*4;
 for(let c=0;c<4;c++){
  output.data[dest+c]=Math.round(
   pixel(xa,ya,c)*(1-tx)*(1-ty)+pixel(xb,ya,c)*tx*(1-ty)+
   pixel(xa,yb,c)*(1-tx)*ty+pixel(xb,yb,c)*tx*ty);
 }
}
const safe=PNG.sync.write(output);
for(const [destination,bytes] of [
 ['public/rivoscan-icon.png',safe],
 ['public/rivoscan-adaptive-foreground.png',safe],
 ['public/rivoscan-logo.png',fullLogo],
 ['node_modules/.cache/rivoscan/icon.png.b64',Buffer.from(safe.toString('base64')+'\n')],
 ['node_modules/.cache/rivoscan/adaptive.png.b64',Buffer.from(safe.toString('base64')+'\n')]
]){
 const file=join(root,destination);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes);
}
console.log('[RivoScan] Original artwork preserved; mask-safe wordmark visible on round and adaptive launcher masks.');
