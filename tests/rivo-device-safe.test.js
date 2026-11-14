import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pngjs from 'pngjs';
// CI runs npm test before npm build; generate the safe derivatives for this test.
import '../scripts/create-turquoise-icon.mjs';
const {PNG}=pngjs;
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const str=path=>read(path).toString('utf8');
test('launcher artwork preserves the complete RivoScan wordmark in a safe mask zone',()=>{
 const data=PNG.sync.read(read('public/rivoscan-icon.png'));
 assert.equal(data.width,512);assert.equal(data.height,512);
 let left=512,right=-1,top=512,bottom=-1;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  if(data.data[(y*512+x)*4+3]<20)continue;
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 assert.ok(left>=130&&top>=130&&right<=382&&bottom<=382,
  'complete logo must fit inside every Android adaptive mask safe center');
 assert.ok(right-left>=200,'logo is too small to read on a home screen');
});
test('banner visually aligns with native 320x50 frame while AdMob stays clickable',()=>{
 const css=str('src/rivo-device-safe.css'),ad=str('src/monetization.js'),main=str('src/main.js');
 assert.ok(main.includes("import './rivo-device-safe.css'"));
 assert.match(css,/bottom:var\(--rivo-banner-bottom\)!important/);
 assert.match(css,/width:min\(var\(--rivo-banner-width\),100%\)!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(ad,/position:BannerAdPosition.BOTTOM_CENTER,margin:bannerLastMargin/);
 assert.match(ad,/adSize:BannerAdSize.BANNER/);
 assert.match(ad,/Math\.ceil\(window\.innerHeight-box\.top\)\+8/);
 assert.match(ad,/AdMob\.removeBanner\(\)/);
 assert.match(ad,/document\.documentElement\.clientWidth<320/);
});
test('responsive header shows complete brand text and no clipped img',()=>{
 const css=str('src/rivo-device-safe.css');
 assert.match(css,/object-fit:contain!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/@media\(max-width:320px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
});
