import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Book Scan Save footer stays above measured native banner with no overlap',()=>{
 const css=read('src/rivo-book-banner-safe.css');
 const main=read('src/main.js');
 const book=read('src/book-split.js');
 const ads=read('src/monetization.js');
 assert.match(book,/overlay\.className='rivo-id-overlay rivo-book-overlay'/);
 assert.match(main,/import '\.\/rivo-book-banner-safe\.css'/);
 assert.ok(main.indexOf("import './rivo-book-banner-safe.css'")>main.indexOf("import './rivo-blue-editor-layout.css'"));
 assert.match(css,/bottom:calc\(var\(--rivo-banner-bottom,98px\) \+ var\(--rivo-banner-height,50px\) \+ 8px\)!important/);
 assert.match(css,/min-height:50px!important/);
 assert.match(css,/height:100%!important/);
 assert.match(css,/margin-top:auto!important/);
 assert.match(ads,/if\(el\.matches\('\.rivo-book-overlay,\.rivo-book-overlay > \.rivo-book-dialog'\)\)return false/);
 assert.match(ads,/BannerAdSize\.BANNER/);
});
test('Book preview shrinks until photo is loaded, editor keeps scrollable controls',()=>{
 const css=read('src/rivo-book-banner-safe.css');
 const book=read('src/book-split.js');
 assert.match(css,/max-height:172px!important/);
 assert.match(css,/\.rivo-workspace-settings:not\(\[hidden\]\)/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(book,/previewDock\.classList\.remove\('rivo-book-empty-dock'\)/);
});
test('AdMob has optional rewarded videos and natural-break interstitials',()=>{
 const ads=read('src/monetization.js');
 assert.match(ads,/AdMob\.prepareInterstitial/);
 assert.match(ads,/AdMob\.showInterstitial/);
 assert.match(ads,/AdMob\.prepareRewardVideoAd/);
 assert.match(ads,/AdMob\.showRewardVideoAd/);
 assert.match(ads,/Rewarded video unavailable/);
});
