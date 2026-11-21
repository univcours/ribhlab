import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import pngjs from 'pngjs';
import '../scripts/create-turquoise-icon.mjs';
const {PNG}=pngjs,read=p=>readFileSync(new URL('../'+p,import.meta.url));
const t=p=>read(p).toString('utf8');
test('0.45.26 launcher is full-bleed with blue R and safe adaptive foreground, no wordmark',()=>{
 const image=PNG.sync.read(read('public/rivoscan-icon.png'));
 assert.equal(image.width,512);assert.equal(image.height,512);

 // Full-bleed Play store icon has no transparent black border.
 for(const [x,y] of [[0,0],[511,0],[0,511],[511,511],[255,255]]){
  const i=(y*512+x)*4;
  assert.equal(image.data[i+3],255,'opaque Play logo required');
 }
 const adaptive=PNG.sync.read(read('public/rivoscan-adaptive-foreground.png'));
 assert.equal(adaptive.width,512);
 assert.equal(adaptive.height,512);
 const center=(255*512+255)*4;
 assert.ok(adaptive.data[center+2]>70,'blue brand logo must be visible in the adaptive center');
 assert.notDeepEqual(Buffer.from(adaptive.data),Buffer.from(image.data),'safe-mask and store icon must differ');
 assert.equal(PNG.sync.read(read('public/rivoscan-header-mark.png')).width,512);
});
test('native 320x50 banner anchored in exactly the same passive slot on all pages',()=>{
 const ad=t('src/monetization.js'),css=t('src/rivo-device-safe.css'),main=t('src/main.js');
 assert.match(main,/refreshBannerPosition\(\)/);
 assert.equal((main.match(/src="\/rivoscan-icon\.png"/g)||[]).length,3);\n assert.doesNotMatch(main,/rivoscan-header-mark\.png/);
 assert.match(ad,/position:BannerAdPosition.BOTTOM_CENTER,margin:bannerLastMargin/);
 assert.match(ad,/adSize:BannerAdSize.BANNER/);
 assert.match(ad,/AdMob\.removeBanner\(\)/);
 assert.match(ad,/document\.documentElement\.clientWidth/);
 assert.match(css,/bottom:var\(--rivo-banner-bottom\)!important/);
 assert.match(css,/width:320px!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/max-height:192px!important/);
});
