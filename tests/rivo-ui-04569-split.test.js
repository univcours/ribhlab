import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateAdLayout} from '../src/rivo-native-ad-geometry.js';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
test('QR scanner permanently mounts camera and list in separate horizontal columns',()=>{
 const src=read('src/barcode-scanner.js');
 const css=read('src/rivo-ui-04569.css');
 assert.match(src,/const stage=document\.createElement\('div'\);stage\.className='rivo-live-split-stage'/);
 assert.match(src,/resultsPane\.append\(resultsHeading,status,resultsEmpty,result\)/);
 assert.match(src,/stage\.append\(camera,resultsPane\)/);
 assert.doesNotMatch(src,/box\.append\(head,help,camera,status,result/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(css,/\.rivo-live-results-pane \.(?:rivo-code-results|rivo-live-status)/);
 assert.match(css,/overflow-y:auto!important/);
});
test('License Plate scanner shares exact side-by-side layout and shows a scrollable history',()=>{
 const src=read('src/plate-scanner.js'),css=read('src/rivo-ui-04569.css');
 assert.match(src,/stage\.append\(view,resultsPane\)/);
 assert.match(src,/resultsPane\.append\(resultsHeading,status,resultsEmpty,last,plateHistory\)/);
 assert.match(src,/plateHistory\.prepend\(old\)/);
 assert.match(src,/while\(plateHistory\.childElementCount>30\)/);
 assert.match(css,/\.rivo-plate-results-history\{/);
 assert.match(css,/\.rivo-plate-current\.rivo-plate-match/);
 assert.doesNotMatch(src,/panel\.append\(header,pinned,view,status,last/);
});
test('Home and Documents row grows around complete 66px file preview and type label',()=>{
 const css=read('src/rivo-ui-04569.css');
 assert.match(css,/min-height:92px!important;height:auto!important;max-height:none!important/);
 assert.match(css,/height:66px!important;min-height:66px!important;max-height:66px!important/);
 assert.match(css,/\.rivo-file-kind-badge\{/);
 assert.match(css,/bottom:3px!important/);
 assert.match(css,/\.rivo-file-thumb>\.rivo-file-type-icon\{/);
 const main=read('src/main.js');
 assert.match(main,/import '\.\/rivo-ui-04569\.css';/);
 assert.equal(main.split('class="rivo-file-kind-badge"').length-1,2);
});
test('Plate Scanner tile has dedicated warm background, stronger icon and formatted title',()=>{
 const css=read('src/rivo-ui-04569.css');
 assert.match(css,/data-rivo-feature="plateScanner"/);
 assert.match(css,/linear-gradient\(145deg,#fff5dd,#ffdbae/);
 assert.match(css,/font-weight:900!important/);
 assert.match(css,/stroke-width:2\.65!important/);
});
test('Real banner remains 320x50, exactly 3dp above nav with 5dp protected content',()=>{
 const layout=calculateAdLayout({viewportWidth:393,viewportHeight:873,navTop:774,navBottom:873,headerBottom:68});
 assert.equal(layout.valid,true);
 assert.equal(layout.width,320);assert.equal(layout.height,50);
 assert.equal(layout.margin,102);assert.equal(layout.contentBottom,157);
 assert.equal(layout.bannerTop,721);assert.equal(774-layout.bannerBottom,3);
 assert.equal(layout.bannerTop-(873-layout.contentBottom),5);
 const native=read('src/rivo-ui-04567.css'),ads=read('src/monetization.js');
 assert.match(native,/bottom:var\(--rivo-content-bottom,98px\)!important/);
 assert.ok(ads.includes('const show=!!(visible&&layout.valid&&!bannerWrongSize);'));
 assert.doesNotMatch(ads,/RewardedAd|PRO bonus|Watch ad/);
});
