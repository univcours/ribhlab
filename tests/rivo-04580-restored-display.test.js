import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),oldCss=read('src/rivo-mydocs-04544-layout-04580.css');
const sharedCss=read('src/rivo-phosphor-unified-04581.css');
test('the 0.45.44 flex file-list presentation now powers BOTH Home and My Documents',()=>{
 assert.match(main,/function renderSavedFileRow\(item,index\)/);
 assert.match(main,/matched\.map\(\(\{doc,index\}\)=>renderSavedFileRow\(doc,index\)\)/);
 assert.match(main,/matched\.map\(\(\{item,index\}\)=>renderSavedFileRow\(item,index\)\)/);
 assert.match(oldCss,/display:flex!important;flex-direction:row!important/);
 assert.match(sharedCss,/flex-wrap:nowrap!important/);
 assert.match(sharedCss,/overflow-x:auto!important/);
 assert.doesNotMatch(main,/import '\.\/rivo-inline-actions-04579\.css'/);
});
test('real first-page native PDF thumbnails remain, preserving 58x72 / 50x66',()=>{
 assert.match(main,/getThumbnail\(\{uri,width:136,height:184\}\)/);
 assert.match(main,/documentThumbnailCache/);
 assert.match(main,/data-thumb-uri=/);
 assert.match(sharedCss,/width:58px!important/);
 assert.match(sharedCss,/height:72px!important/);
 assert.match(sharedCss,/width:50px!important/);
 assert.match(sharedCss,/height:66px!important/);
 assert.match(sharedCss,/object-fit:contain!important/);
});
test('saved PDF and image open only via Android external-app chooser',()=>{
 assert.match(main,/async function openSavedDocumentExternally\(doc\)/);
 assert.match(main,/RivoDocuments\.openFile\(\{uri:doc\.uri\}\)/);
 assert.doesNotMatch(main,/createDocumentViewer|docViewerUI|doc-detail-overlay/);
 assert.match(main,/data-doc-external/);
 const native=read('native/android/RivoDocumentsPlugin.java');
 assert.match(native,/Intent\.ACTION_VIEW/);
 assert.match(native,/Intent\.createChooser\(open/);
 assert.match(native,/FLAG_GRANT_READ_URI_PERMISSION/);
});

test('new signed tester build 0.45.95 code 210 is monotonic',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.95');
 assert.match(read('rivoscan-version.properties'),/^versionCode=210$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.95$/m);
});
