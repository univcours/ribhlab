/** RivoScan approved blue R and wordmark enlarged with less white border. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import pngjs from 'pngjs';
const {PNG}=pngjs,root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=readFileSync(join(root,'assets/branding/rivoscan-icon-adaptive-foreground.png'));
const flat=readFileSync(join(root,'assets/branding/rivoscan-icon-source.png'));
const fullLogo=readFileSync(join(root,'assets/branding/rivoscan-logo-original.png'));
for(const [name,b,size] of [['flat',flat,512],['adaptive',original,512],['full wordmark',fullLogo,1254]]){
 if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.readUInt32BE(16)!==size||b.readUInt32BE(20)!==size)throw Error('Bad approved '+name);
}
const input=PNG.sync.read(original,{checkCRC:true});
function blank(){return new PNG({width:512,height:512});}
function card(out,x,y,w,h,r){
 for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){
  const dx=Math.max(x+r-px-.5,0,px-(x+w-r)+.5),dy=Math.max(y+r-py-.5,0,py-(y+h-r)+.5);
  if(dx*dx+dy*dy>r*r)continue;
  const k=(py*512+px)*4;out.data[k]=out.data[k+1]=out.data[k+2]=out.data[k+3]=255;
 }
}
function composite(out,sx,sy,sw,sh,dx,dy,dw,dh){
 for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
  const ux=sx+(x+.5)*sw/dw-.5,uy=sy+(y+.5)*sh/dh-.5;
  const x0=Math.max(0,Math.min(511,Math.floor(ux))),y0=Math.max(0,Math.min(511,Math.floor(uy)));
  const x1=Math.min(511,x0+1),y1=Math.min(511,y0+1),fx=Math.max(0,Math.min(1,ux-x0)),fy=Math.max(0,Math.min(1,uy-y0));
  const k=((dy+y)*512+dx+x)*4,v=[];
  for(let c=0;c<4;c++)v[c]=input.data[(y0*512+x0)*4+c]*(1-fx)*(1-fy)+input.data[(y0*512+x1)*4+c]*fx*(1-fy)+input.data[(y1*512+x0)*4+c]*(1-fx)*fy+input.data[(y1*512+x1)*4+c]*fx*fy;
  const sa=v[3]/255,da=out.data[k+3]/255,oa=sa+da*(1-sa);
  for(let c=0;c<3;c++)out.data[k+c]=oa?Math.round((v[c]*sa+out.data[k+c]*da*(1-sa))/oa):0;
  out.data[k+3]=Math.round(oa*255);
 }
}
const icon=blank(),header=blank();
card(icon,112,101,288,304,52);
composite(icon,118,84,269,266,146,111,220,220);
composite(icon,90,359,335,72,148,339,216,46);
composite(header,118,84,269,266,28,28,456,456);
const png=PNG.sync.write(icon);
for(const [name,b] of [
 ['public/rivoscan-icon.png',png],
 ['public/rivoscan-adaptive-foreground.png',png],
 ['public/rivoscan-header-mark.png',PNG.sync.write(header)],
 ['public/rivoscan-logo.png',fullLogo],
 ['node_modules/.cache/rivoscan/icon.png.b64',Buffer.from(png.toString('base64')+'\n')],
 ['node_modules/.cache/rivoscan/adaptive.png.b64',Buffer.from(png.toString('base64')+'\n')]
]){
 const out=join(root,name);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,b);
}
console.log('[RivoScan] Approved R and complete wordmark with minimal white margin.');
