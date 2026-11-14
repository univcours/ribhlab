/**
 * RivoScan brand source of truth: user's selected original R+scan artwork.
 * Never redraw the icon during a build: copy the committed PNG source to the
 * WebView and to the deterministic Android branding cache.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=[
 ['assets/branding/rivoscan-icon-source.png','public/rivoscan-icon.png','node_modules/.cache/rivoscan/icon.png.b64'],
 ['assets/branding/rivoscan-icon-adaptive-foreground.png','public/rivoscan-adaptive-foreground.png','node_modules/.cache/rivoscan/adaptive.png.b64']
];
for(const [source,destination,cache] of files){
 const png=readFileSync(join(root,source));
 if(png.length<1024||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==512||png.readUInt32BE(20)!==512)
  throw Error('Unexpected brand PNG: '+source+'; expected 512x512');
 for(const [dest,bytes] of [[destination,png],[cache,Buffer.from(png.toString('base64')+'\n')]]){
  const p=join(root,dest);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);
 }
}
console.log('[RivoScan] Original approved R+scan brand icon copied into WebView and Android icon cache.');
