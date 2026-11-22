import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateAdLayout} from '../src/rivo-native-ad-geometry.js';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('0.45.71 source and Android release metadata agree',()=>{
 const meta=source('rivoscan-version.properties');
 const pkg=JSON.parse(source('package.json'));
 assert.match(meta,/^versionCode=186$/m);
 assert.match(meta,/^versionName=0\.45\.71$/m);
 assert.equal(pkg.version,'0.45.71');
});
test('QR and barcode keep vertically stacked camera/result layout, save state and timestamps',()=>{
 const js=source('src/barcode-scanner.js');
 assert.match(js,/stage\.append\(camera,resultsPane\)/);
 assert.match(js,/resultsPane\.append\(resultsHeading,status,resultsEmpty,result\)/);
 assert.match(js,/rivo-code-result-time/);
 assert.match(js,/rivo-code-result-save-state/);
 for(const kind of ["'saved'","'already'","'failed'"])
  assert.ok(js.includes(kind),'missing status '+kind);
 assert.match(js,/setAttribute\('aria-label','Zoom out'\)/);
 assert.match(js,/caps\.focusMode\.includes\('continuous'\)/);
});
test('Plate history is below camera, offers Copy and time per record',()=>{
 const js=source('src/plate-scanner.js');
 assert.match(js,/stage\.append\(view,resultsPane\)/);
 assert.match(js,/lastTime\.textContent=new Date\(\)\.toLocaleTimeString\(language\)/);
 assert.match(js,/lastCopy\.addEventListener\('click'/);
 assert.match(js,/plateHistory\.prepend\(old\)/);
 assert.match(js,/copyPlate\(value\.textContent\)/);
 assert.doesNotMatch(js,/await onMatchPhoto\(/);
});
test('No automatic plate photos; persistent scanner ledgers are single TXT per category',()=>{
 const ledger=source('src/scan-ledger.js');
 assert.match(ledger,/RS_QR\.txt/);
 assert.match(ledger,/RS_Bar\.txt/);
 assert.match(ledger,/RivoScan_Plates\.txt/);
 assert.match(source('src/plate-scanner.js'),/The plate scanner writes to its ONE persistent TXT ledger only/);
});
test('Book Scan Save is pinned above bottom and empty photo controls remain accessible',()=>{
 const css=source('src/rivo-qa-04570.css');
 const book=source('src/book-split.js');
 assert.match(css,/\.rivo-book-dialog \.rivo-code-actions\.rivo-edit-bottom-bar/);
 assert.match(css,/flex:0 0 54px!important/);
 assert.match(css,/height:42px!important/);
 assert.match(book,/rivo-book-empty-actions/);
 assert.match(book,/emptyActions\.hidden=true/);
});
test('All four Home shortcuts fit complete text and Plate has a distinct warm background',()=>{
 const css=source('src/rivo-qa-04570.css');
 assert.match(css,/height:84px!important/);
 assert.match(css,/button\.rivo-feature-tile\[data-rivo-feature="plateScanner"\]/);
 assert.match(css,/font-weight:900!important/);
 assert.match(source('src/main.js'),/import '\.\/rivo-qa-04570\.css'/);
});
test('Banner stays native 320 x 50 with 3dp navigation gap and 5dp content protection',()=>{
 const layout=calculateAdLayout({viewportWidth:393,viewportHeight:873,navTop:774,navBottom:873,headerBottom:68});
 assert.equal(layout.valid,true);
 assert.equal(layout.width,320);assert.equal(layout.height,50);
 assert.equal(layout.bannerTop,721);
 assert.equal(774-layout.bannerBottom,3);
 assert.equal(layout.bannerTop-(873-layout.contentBottom),5);
 const ads=source('src/monetization.js');
 assert.doesNotMatch(ads,/showRewardVideoAd|showRewardInterstitialAd|PRO bonus/);
 assert.match(ads,/AdMob\.showInterstitial/);
});
test('ID Photo has exactly one camera, one centered import and disabled direction controls initially',()=>{
 const js=source('src/id-photo-maker.js');
 assert.match(js,/Only one camera on the rail/);
 assert.match(js,/workspace\.dock\.append\(previewImport,leftRail,rightRail,input\)/);
 assert.match(js,/for\(const b of moveButtons\)\{b\.disabled=!image/);
 assert.match(js,/Camera\.getPhoto/);
 assert.match(js,/workspace\.empty\.hidden=true/);
});
