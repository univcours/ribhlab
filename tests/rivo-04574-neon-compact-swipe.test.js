import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDismissSwipe,canStartModalSwipe} from '../src/swipe-dismiss.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/rivo-visual-04574.css');
const main=read('src/main.js');

test('Home and Tools use a single compact row: icon before the feature name',()=>{
 assert.match(css,/flex-direction:row!important/);
 assert.match(css,/\.rivo-home \.rivo-feature-rail>\.rivo-feature-tile/);
 assert.match(css,/\.rivo-tools-scroll \.rivo-hub-grid>\.rivo-hub-tile/);
 assert.match(css,/grid-auto-rows:minmax\(66px,auto\)!important/);
 assert.match(css,/grid-auto-rows:minmax\(68px,auto\)!important/);
 assert.doesNotMatch(main,/background:linear-gradient\(145deg,hsl\(\$\{hue\}/);
});
test('Original background hues now color the revolving border and readable neon ink',()=>{
 assert.match(css,/@property --rivo-edge-turn/);
 assert.match(css,/@keyframes rivoEdgeOrbit/);
 assert.match(css,/animation:rivoEdgeOrbit 5\.8s linear infinite!important/);
 assert.match(css,/mask-composite:exclude!important/);
 assert.match(css,/color:hsl\(var\(--rivo-card-hue,210\) 93% 34%\)!important/);
 assert.match(css,/background:linear-gradient\(152deg,#FFFFFF,#F4FAFF\)!important/);
 assert.match(main,/\[210,335,33,266\]\[i\]/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('QR camera occupies top half and scrolling results occupy bottom half',()=>{
 assert.match(css,/\.rivo-code-overlay\.rivo-live-overlay \.rivo-live-split-stage\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(css,/\.rivo-live-split-stage>\.rivo-live-preview\{/);
 assert.match(css,/grid-column:1!important;grid-row:1!important/);
 assert.match(css,/\.rivo-live-split-stage>\.rivo-live-results-pane\{/);
 assert.match(css,/grid-column:1!important;grid-row:2!important/);
 assert.match(css,/overflow-y:auto!important/);
});
test('Small native copy and external-link SVG icon buttons remain alongside results',()=>{
 const qr=read('src/barcode-scanner.js');
 assert.match(qr,/valueLine\.append\(value,buttons\)/);
 assert.match(qr,/scannerResultIcon\('copy'\)/);
 assert.match(qr,/scannerResultIcon\('link'\)/);
 assert.match(qr,/if\(safeScannedUrl\(item.value\)\)/);
 assert.match(css,/width:29px!important;height:29px!important/);
});
test('Deliberate pull down closes modals; normal scroll, quick taps and sideways moves do not',()=>{
 assert.equal(isDismissSwipe({dx:0,dy:150,elapsedMs:360}),true);
 assert.equal(isDismissSwipe({dx:20,dy:92,elapsedMs:150}),true);
 assert.equal(isDismissSwipe({dx:140,dy:30,elapsedMs:120}),false);
 assert.equal(isDismissSwipe({dx:0,dy:60,elapsedMs:250}),false);
 assert.equal(isDismissSwipe({dx:0,dy:150,elapsedMs:15}),false);
 assert.equal(isDismissSwipe({dx:0,dy:150,elapsedMs:2000}),false);
 assert.match(main,/canStartModalSwipe\(event.target\)/);
 assert.match(main,/navigateRivoBack\(\)/);
 const panel={closest:selector=>selector.includes('[role="dialog"]')?panel:null};
 const header={closest:selector=>selector.includes('.rivo-live-head')?{closest:()=>panel}:null};
 assert.equal(canStartModalSwipe(header),true);
 const input={closest:selector=>selector.includes('button,a,input')?{}:null};
 assert.equal(canStartModalSwipe(input),false);
});
test('Android version metadata matches 0.45.87 (191)',()=>{
 assert.match(read('rivoscan-version.properties'),/^versionCode=202$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.87$/m);
 assert.equal(JSON.parse(read('package.json')).version,'0.45.87');
});
