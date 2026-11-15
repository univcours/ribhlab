/** RivoScan 0.45.26 - user approved symbol-only glossy blue R.
 * Separate full-bleed store icon and centred adaptive launcher foreground.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import pngjs from 'pngjs';
const {PNG}=pngjs,root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const remote='https://gcdn.picsart.com/picsart-mcp/ce5d87c2-dc15-45ff-8b58-16e8d5ac8fd7.png';
const sourcePath=join(root,'assets/branding/rivoscan-ai-icon-source.png');
const fullLogo=readFileSync(join(root,'assets/branding/rivoscan-logo-original.png'));
let bytes;
if(existsSync(sourcePath))bytes=readFileSync(sourcePath);
else{
 const response=await fetch(remote,{signal:AbortSignal.timeout(40000)});
 if(!response.ok)throw Error('RivoScan approved icon fetch failed: '+response.status);
 bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>8_000_000)throw Error('Icon file too large');
 mkdirSync(dirname(sourcePath),{recursive:true});writeFileSync(sourcePath,bytes);
}
if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid approved icon PNG');
const input=PNG.sync.read(bytes,{checkCRC:true});
if(input.width!==1254||input.height!==1254)throw Error('Expected 1254x1254 icon artwork');
const flat=new PNG({width:512,height:512}),adaptive=new PNG({width:512,height:512});
const header=new PNG({width:512,height:512});
const lim=(n,a,b)=>Math.min(b,Math.max(a,n));
function pixel(x,y,c){
 const fx=lim((x+.5)*1254/512-.5,0,1253),fy=lim((y+.5)*1254/512-.5,0,1253);
 const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(x0+1,1253),y1=Math.min(y0+1,1253);
 const tx=fx-x0,ty=fy-y0;
 const v=(xx,yy)=>input.data[(yy*1254+xx)*4+c];
 return v(x0,y0)*(1-tx)*(1-ty)+v(x1,y0)*tx*(1-ty)+v(x0,y1)*(1-tx)*ty+v(x1,y1)*tx*ty;
}
for(let y=0;y<512;y++)for(let x=0;x<512;x++){
 const i=(y*512+x)*4,colors=[pixel(x,y,0),pixel(x,y,1),pixel(x,y,2)];
 const opacity=lim((Math.max(...colors)-18)/65,0,1);
 const background=[5+6*x/511,49+82*x/511,178+50*x/511];
 for(let c=0;c<3;c++)flat.data[i+c]=Math.round(opacity*colors[c]+(1-opacity)*background[c]);
 flat.data[i+3]=255;
}
for(let y=0;y<512;y++)for(let x=0;x<512;x++){
 const i=(y*512+x)*4;
 for(let c=0;c<4;c++)header.data[i+c]=flat.data[i+c];
 // Keep the R/symbol inside Android adaptive masks instead of shrinking Play art.
 const sx=Math.floor((x-80)*512/352),sy=Math.floor((y-80)*512/352);
 if(sx>=0&&sx<512&&sy>=0&&sy<512){
  const k=(sy*512+sx)*4;
  for(let c=0;c<4;c++)adaptive.data[i+c]=flat.data[k+c];
 }
}
const store=PNG.sync.write(flat),adapt=PNG.sync.write(adaptive);
for(const [name,data] of [
 ['public/rivoscan-icon.png',store],
 ['public/rivoscan-store-icon.png',store],
 ['public/rivoscan-adaptive-foreground.png',adapt],
 ['public/rivoscan-header-mark.png',PNG.sync.write(header)],
 ['public/rivoscan-logo.png',fullLogo],
 ['node_modules/.cache/rivoscan/icon.png.b64',Buffer.from(store.toString('base64')+'\n')],
 ['node_modules/.cache/rivoscan/adaptive.png.b64',Buffer.from(adapt.toString('base64')+'\n')]
]){
 const p=join(root,name);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,data);
}
console.log('[RivoScan] Symbol-only large R ready (no RivoScan wordmark).');
