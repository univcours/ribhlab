import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateAdLayout,nativeAdFits,AD_WIDTH,AD_HEIGHT} from '../src/rivo-native-ad-geometry.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/rivo-neon-04571.css');

test('Neon stylesheet loads AFTER all prior theme rules',()=>{
 const main=read('src/main.js');
 assert.ok(main.indexOf("import './rivo-neon-04571.css';")>main.indexOf("import './rivo-qa-04570.css';"));
 assert.match(css,/--rivo-neon-cyan/);
 assert.match(css,/--rivo-neon-magenta/);
});
test('QR/Barcode and Moroccan plate scanners use camera TOP and results BOTTOM',()=>{
 const code=read('src/barcode-scanner.js'),plate=read('src/plate-scanner.js');
 assert.match(code,/stage\.append\(camera,resultsPane\)/);
 assert.match(plate,/stage\.append\(view,resultsPane\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/grid-template-rows:minmax\(0,0\.94fr\) minmax\(0,1\.06fr\)!important/);
 assert.match(css,/grid-row:1!important;grid-column:1!important/);
 assert.match(css,/grid-row:2!important;grid-column:1!important/);
});
test('Results use independent overflow-y auto, never hide beneath camera',()=>{
 assert.match(css,/\.rivo-code-results,\s*[\s\S]*?\.rivo-plate-results-history\{/);
 assert.match(css,/overflow-y:auto!important;overflow-x:hidden!important/);
 assert.match(css,/overscroll-behavior:contain!important/);
 assert.match(css,/min-height:0!important/);
});
test('Home and Tools tile grids stay in normal flow, without overlapping other widgets',()=>{
 assert.match(css,/\.rivo-feature-rail\{/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-auto-rows:minmax\(91px,auto\)!important/);
 assert.match(css,/\.rivo-hub-grid\{/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-auto-rows:minmax\(108px,auto\)!important/);
 assert.match(css,/\.rivo-home-search-title-row\{/);
 assert.match(css,/data-rivo-feature="plateScanner"/);
});
test('Native banner is constrained to the precise 320 x 50dp slot',()=>{
 assert.equal(AD_WIDTH,320);assert.equal(AD_HEIGHT,50);
 assert.equal(nativeAdFits({width:320,height:50}),true);
 assert.equal(nativeAdFits({width:321,height:50}),false);
 assert.equal(nativeAdFits({width:320,height:51}),false);
 assert.equal(calculateAdLayout({viewportWidth:319,viewportHeight:852,navTop:748,navBottom:852}).valid,false);
 const l=calculateAdLayout({viewportWidth:393,viewportHeight:852,navTop:748,navBottom:852,headerBottom:65});
 assert.equal(l.valid,true);
 assert.equal(l.bannerBottom,745);
 assert.equal(l.bannerTop,695);
 assert.equal(l.contentBottom,162);
 assert.equal(748-l.bannerBottom,3);
 assert.equal(l.bannerTop-(852-l.contentBottom),5);
});
test('No rewarded ad prompt and fullscreen ads remain ordinary interstitials',()=>{
 const ads=read('src/monetization.js');
 assert.doesNotMatch(ads,/PRO bonus|RewardedAd|showRewardVideoAd/);
 assert.match(ads,/AdMob\.showInterstitial/);
});
test('Background animations stop when reduced motion is requested',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important;transition:none!important/);
});
