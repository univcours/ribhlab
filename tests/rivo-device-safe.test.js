import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import pngjs from 'pngjs';
import '../scripts/create-turquoise-icon.mjs';
const {PNG}=pngjs,read=p=>readFileSync(new URL('../'+p,import.meta.url));
const t=p=>read(p).toString('utf8');
test('approved enlarged mask-safe launcher keeps the wordmark complete',()=>{
 const image=PNG.sync.read(read('public/rivoscan-icon.png'));
 assert.equal(image.width,512);assert.equal(image.height,512);
 let minX=512,maxX=0;
 for(let y=340;y<390;y++)for(let x=0;x<512;x++){
  const i=(y*512+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2];
  if(image.data[i+3]<100||(r>210&&g>210&&b>210))continue;
  minX=Math.min(x,minX);maxX=Math.max(x,maxX);
  assert.ok(Math.hypot(x-256,y-256)<180,'wordmark masked by a round launcher');
 }
 assert.ok(minX<165&&maxX>350,'wordmark too small');
 assert.equal(PNG.sync.read(read('public/rivoscan-header-mark.png')).width,512);
});
test('native 320x50 banner anchored in exactly the same passive slot on all pages',()=>{
 const ad=t('src/monetization.js'),css=t('src/rivo-device-safe.css'),main=t('src/main.js');
 assert.match(main,/refreshBannerPosition\(\)/);
 assert.match(main,/src="\/rivoscan-header-mark.png"/);
 assert.match(ad,/position:BannerAdPosition.BOTTOM_CENTER,margin:bannerLastMargin/);
 assert.match(ad,/adSize:BannerAdSize.BANNER/);
 assert.match(ad,/AdMob\.removeBanner\(\)/);
 assert.match(ad,/document\.documentElement\.clientWidth/);
 assert.match(css,/bottom:var\(--rivo-banner-bottom\)!important/);
 assert.match(css,/width:320px!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/max-height:192px!important/);
});
