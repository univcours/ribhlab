import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateAdLayout,nativeAdFits,AD_WIDTH,AD_HEIGHT} from '../src/rivo-native-ad-geometry.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/rivo-classic-04572.css');
test('Original 0.45.44 ice/royal-blue palette is the last imported visual layer',()=>{
 const original=read('src/rivo-blue-theme.css');
 const main=read('src/main.js');
 for(const hex of ['#061427','#082752','#11407F','#0E61C2','#0878E8','#26A6F5','#00D8FF','#E9F5FB','#F5FAFF','#B8D9F2']){
  assert.ok(original.includes(hex),'missing original color '+hex);
  assert.ok(css.includes(hex),'classic style lacks '+hex);
 }
 assert.ok(main.indexOf("import './rivo-classic-04572.css';")>main.indexOf("import './rivo-qa-04570.css';"));
 assert.doesNotMatch(main,/import '\.\/rivo-neon-04571\.css'/);
});
test('Home tiles and My Files header are in separate nonoverlapping layout rows',()=>{
 assert.match(css,/\.rivo-feature-rail\{/);
 assert.match(css,/grid-auto-rows:minmax\(101px,auto\)!important/);
 assert.match(css,/margin:0 0 15px!important/);
 assert.match(css,/\.rivo-home-search-title-row\{/);
 assert.match(css,/min-height:42px!important/);
 assert.match(css,/data-rivo-feature="plateScanner"/);
 assert.match(css,/-webkit-text-fill-color:#082752!important/);
});
test('TXT QR / Barcode legacy duplicate names are correctly icon-labeled',()=>{
 const main=read('src/main.js');
 assert.match(main,/rs_bar\(\?:\\s\*\\\(\\d\+\\\)\)\?/);
 assert.match(main,/rivoscan\)_qr/);
 assert.match(css,/\.rivo-file-thumb>\.rivo-file-kind-badge/);
 assert.match(css,/height:54px!important/);
});
test('Live QR and plate results use same-line copy/link SVG controls',()=>{
 const qr=read('src/barcode-scanner.js'),plate=read('src/plate-scanner.js');
 assert.match(qr,/scannerResultIcon\('copy'\)/);
 assert.match(qr,/scannerResultIcon\('link'\)/);
 assert.match(qr,/valueLine\.append\(value,buttons\)/);
 assert.match(plate,/lastCopy\.append\(plateCopyGlyph\(\)\)/);
 assert.match(plate,/valueLine\.append\(value,btnCopy\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.rivo-code-value-line/);
});
test('Native TXT append reuses existing aliases or rejects generated duplicate names',()=>{
 const java=read('native/android/RivoDocumentsPlugin.java');
 assert.match(java,/public synchronized void appendScannerText/);
 assert.match(java,/Reu(?:se|sing) an app-owned legacy/);
 assert.match(java,/duplicate TXT refused/);
 assert.match(java,/MediaStore\.MediaColumns\.DISPLAY_NAME/);
 assert.match(read('src/scan-ledger.js'),/RS_QR\.txt/);
 assert.match(read('src/scan-ledger.js'),/RS_Bar\.txt/);
});
test('Native 320 x 50 banner uses a separate 13dp upper artwork guard',()=>{
 assert.equal(AD_WIDTH,320);assert.equal(AD_HEIGHT,50);
 assert.equal(nativeAdFits({width:320,height:50}),true);
 assert.equal(nativeAdFits({width:320,height:51}),false);
 const l=calculateAdLayout({viewportWidth:393,viewportHeight:852,navTop:748,navBottom:852,headerBottom:65});
 assert.equal(l.valid,true);assert.equal(l.bannerTop,695);assert.equal(l.bannerBottom,745);
 assert.equal(l.contentBottom,175);
 assert.equal(l.bannerTop-(852-l.contentBottom),18);
 assert.match(css,/rivo-banner-frame-height,63px/);
});
test('No rewarded prompt, original Google Play upload signature preserved',()=>{
 const ads=read('src/monetization.js');
 assert.doesNotMatch(ads,/PRO bonus|RewardedAd|showRewardVideoAd/);
 assert.match(ads,/AdMob\.showInterstitial/);
 assert.match(read('rivoscan-version.properties'),/^versionCode=200$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.85$/m);
});
test('Reduced motion is respected',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important/);
});
