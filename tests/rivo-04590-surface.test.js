import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {materialSymbol} from '../src/material-symbols.js';
import {calculateAdLayout} from '../src/rivo-native-ad-geometry.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('floating camera uses camera glyph; Smart Scan retains its original scan glyph',()=>{
 const main=read('src/main.js');
 const fab=main.match(/<button type="button" class="floating-scan rivo-camera-fab"[^\n]*/)?.[0];
 assert.ok(fab,'FAB markup required');
 assert.match(fab,/ico\('camera',32\)/);
 assert.doesNotMatch(fab,/ico\('scan',32\)/);
 assert.match(fab,/cameraFabText\(\)/);
 assert.match(materialSymbol('camera',32),/data-material-symbol="photo_camera"/);
 assert.match(main,/rivo-nav-scan-ring[^\n]*ico\('scan',27\)/);
});
test('ad reservation does not claim impressions and does not conflate SDK loaded',()=>{
 const ads=read('src/monetization.js');
 assert.match(ads,/classList\.toggle\('rivo-ad-reserved',reserved\)/);
 assert.match(ads,/classList\.toggle\('rivo-has-ad-banner',displayed\)/);
 assert.match(ads,/reserved\?layout\.contentBottom:layout\.bottomWithoutAd\+8/);
 assert.match(ads,/BannerAdPosition\.BOTTOM_CENTER,margin:bannerLastMargin/);
 assert.match(ads,/BannerAdPluginEvents\.AdImpression/);
 assert.match(ads,/bannerObstructed\(\)/);
 assert.match(ads,/observeBannerOverlays\(\)/);
});
test('Android status bar overlay disabled and preview save remains within safe screen',()=>{
 const cfg=JSON.parse(read('capacitor.config.json'));
 assert.equal(cfg.plugins.StatusBar.overlaysWebView,false);
 const css=read('src/rivo-android-surface-04590.css');
 assert.match(css,/rivo-ad-reserved/);
 assert.match(css,/rivo-fab-clearance/);
 assert.match(css,/rivo-workspace-bottom/);
 assert.match(css,/rivo-workspace-has-image/);
 assert.match(css,/rivo-system-safe-top/);
});
test('320dp banner is anchored exactly between scroll viewport and app navigation',()=>{
 for(const width of [320,360,393,480,768]){
  const v=calculateAdLayout({viewportWidth:width,viewportHeight:852,navTop:749,navBottom:852,headerBottom:72});
  assert.equal(v.valid,true);
  assert.equal(v.width,320);
  assert.equal(v.height,50);
  assert.ok(v.bannerBottom<749);
  assert.ok(852-v.contentBottom<=v.bannerTop-5);
 }
});

test('Android shell and native banner use the identical measured WebView viewport',()=>{
 const js=read('src/main.js'),css=read('src/rivo-android-surface-04590.css');
 assert.match(js,/--rivo-webview-height/);
 assert.match(js,/window\.innerHeight/);
 assert.match(js,/visualViewport\?\.addEventListener\('resize'/);
 assert.match(css,/height:var\(--rivo-webview-height,100dvh\)!important/);
});
