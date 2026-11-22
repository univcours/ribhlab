import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Native banner is not hidden by an ordinary document popup or save progress',()=>{
 const ads=get('src/monetization.js');
 const fn=ads.match(/function bannerObstructed\(\)\{([\s\S]*?)\n\}/)?.[1];
 assert.ok(fn,'banner visibility policy exists');
 assert.match(fn,/return false;/);
 assert.doesNotMatch(fn,/state\.busy|document\.activeElement|querySelectorAll/);
 assert.ok(ads.includes('pauseBannerForFullscreen()'),'full-screen ads explicitly pause banner');
 assert.ok(ads.includes('restoreBannerAfterFullscreen()'),'full-screen ads restore banner');
});
test('All native tool overlay families respect the reserved AdMob banner space',()=>{
 const css=get('src/rivo-ui-04567.css');
 for(const cls of ['rivo-id-overlay','rivo-code-overlay','rivo-live-overlay',
  'rivo-plate-overlay','rivo-merged-overlay','rivo-shield-overlay',
  'rivo-edge-adjust-overlay','rivo-editor-overlay','rivo-pages-overlay',
  'rivo-page-manager-overlay','rivo-perfectscan-overlay',
  'rivo-perfect-capture-overlay','rivo-release-overlay','rivo-update-gate',
  'rivo-viewer-layer','bulk-overlay','doc-detail-overlay','busy']){
  assert.ok(css.includes('.'+cls),'missing native safe area for '+cls);
 }
 assert.match(css,/bottom:var\(--rivo-content-bottom,98px\)!important/);
 assert.match(css,/border-radius:20px!important/);
 assert.match(css,/border:1\.5px solid #85bce9!important/);
 assert.match(css,/:not\(\.rivo-has-ad-banner\) #app \.rivo-ad-banner-slot/);
 const main=get('src/main.js');
 assert.ok(main.includes("import './rivo-ui-04567.css';"));
});
