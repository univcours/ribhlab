/**
 * Original RivoScan R+document scan logo chosen by the app publisher.
 * Preserve original RGBA artwork in full; never redraw, recolor or quantize.
 * 512px icon is directly cropped from the supplied 1254px source image.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=[
 {source:'assets/branding/rivoscan-icon-source.png',destination:'public/rivoscan-icon.png',cache:'node_modules/.cache/rivoscan/icon.png.b64',size:512},
 {source:'assets/branding/rivoscan-icon-adaptive-foreground.png',destination:'public/rivoscan-adaptive-foreground.png',cache:'node_modules/.cache/rivoscan/adaptive.png.b64',size:512},
 {source:'assets/branding/rivoscan-logo-original.png',destination:'public/rivoscan-logo.png',cache:null,size:1254}
];
for(const {source,destination,cache,size} of assets){
 const png=readFileSync(join(root,source));
 if(png.length<1024||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==size||png.readUInt32BE(20)!==size)
  throw Error('Incorrect approved logo image '+source+'; expected '+size+'px RGBA PNG');
 const dest=join(root,destination);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,png);
 if(cache){
  const target=join(root,cache);mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,png.toString('base64')+'\n');
 }
}
console.log('[RivoScan] Exact unquantized original R+scan app icon and brand wordmark installed.');
