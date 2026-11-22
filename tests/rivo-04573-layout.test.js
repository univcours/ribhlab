import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/rivo-layout-04573.css');

test('0.45.73 Home feature grid reserves a fixed row and cannot hide My Files',()=>{
 assert.match(css,/grid-template-rows:112px!important/);
 assert.match(css,/height:122px!important/);
 assert.match(css,/max-height:112px!important/);
 assert.match(css,/\.rivo-home-search-title-row\{/);
 assert.match(css,/height:44px!important/);
 assert.match(read('src/main.js'),/import '\.\/rivo-layout-04573\.css';/);
});
test('Home features have four distinct accessible colors with visible icons',()=>{
 for(const token of ['#B9E8FF','#FFC0D9','#FFD29B','#D7BDFF']){
  assert.ok(css.includes(token),'missing card color '+token);
 }
 assert.match(css,/rivo-feature-icon svg/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Only Plate is vertical top-camera and bottom-results, QR remains horizontal',()=>{
 assert.match(css,/\.rivo-plate-overlay\.rivo-live-overlay \.rivo-live-split-stage\s*\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(css,/grid-column:1!important;grid-row:2!important/);
 assert.doesNotMatch(css,/html body \.rivo-code-overlay\.rivo-live-overlay \.rivo-live-split-stage\{/);
 assert.match(read('src/rivo-classic-04572.css'),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});
test('Tool list scrolls to last item with padding above bottom AdMob',()=>{
 assert.match(css,/\.rivo-tools-hub \.rivo-tools-scroll\{/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/scroll-padding-bottom:38px!important/);
});
test('QR inline actions, fixed scanner TXT files and 320x50 banner are preserved',()=>{
 const qr=read('src/barcode-scanner.js'),ads=read('src/rivo-native-ad-geometry.js');
 assert.match(qr,/valueLine\.append\(value,buttons\)/);
 assert.match(qr,/scannerResultIcon\('copy'\)/);
 assert.match(qr,/scannerResultIcon\('link'\)/);
 assert.match(ads,/AD_WIDTH=320,AD_HEIGHT=50/);
 assert.match(read('src/scan-ledger.js'),/RS_QR\.txt/);
 assert.match(read('src/scan-ledger.js'),/RS_Bar\.txt/);
});
test('Release build version increased, no Play upload enabled',()=>{
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.73$/m);
 assert.match(read('rivoscan-version.properties'),/^versionCode=188$/m);
 assert.equal(JSON.parse(read('package.json')).version,'0.45.73');
 const yml=read('.github/workflows/rivoscan-04573-layout-and-plate.yml');
 assert.match(yml,/Never upload to Play|NEVER upload to Play/);
});
