import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Tool dialogs use lifecycle-aware close without hitting Save',()=>{
 for(const p of ['book-split','count-cam','id-photo-maker','pdf-lock','formula-ocr','photo-translation','document-ai','whats-new'])
  assert.match(read('src/'+p+'.js'),/mountDialogControls\(\{/);
 const s=read('src/main.js'),h=read('src/modal-shell.js');
 assert.match(s,/data-rivo-modal-close/);assert.match(h,/rivoModalClose/);
 assert.doesNotMatch(s,/last\?\.querySelector\('button:last-of-type'\)/);
});
test('Button grids fit mobile viewport and right-to-left swipe never triggers form controls',()=>{
 const css=read('src/modal-shell.css'),h=read('src/modal-shell.js');
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/white-space:normal!important/);
 assert.match(h,/window\.innerWidth-76/);
 assert.match(h,/dx>-90/);
 assert.match(h,/input,select,textarea,label,canvas/);
});
test('Ad diagnostics exposes native banner load status and retries',()=>{
 const main=read('src/main.js'),ad=read('src/monetization.js');
 assert.match(main,/rivo-ad-diagnostics/);
 assert.match(main,/data-ad-retry/);
 assert.match(ad,/bannerEnabled:AD_CONFIG.bannerEnabled/);
 assert.match(ad,/BannerAdSize.BANNER/);
 assert.match(ad,/BannerAdPosition.BOTTOM_CENTER/);
 assert.match(ad,/AdMob.hideBanner\(\)/);
 assert.match(ad,/AdMob.resumeBanner\(\)/);
 assert.match(read('src/main.js'),/rivo-ad-banner-slot/);
 assert.match(read('src/modal-shell.css'),/body.rivo-has-ad-banner/);
 assert.match(ad,/if\(!deferBanner\)void loadBanner\(\)/);
 assert.match(ad,/void loadInterstitial\(\);void loadAppOpen\(\)/);
});
