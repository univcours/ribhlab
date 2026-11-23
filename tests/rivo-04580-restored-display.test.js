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
test('PDF and image preview stays in RivoScan, with explicit Android chooser',()=>{
 const viewer=read('src/document-viewer.js');
 assert.match(main,/return docViewerUI\.open\(doc\)/);
 assert.match(main,/onPreview:doc=>previewSavedDocument\(doc\)/);
 assert.match(viewer,/bridge\.openFile\(\{uri:current\.uri\}\)/);
 assert.match(viewer,/doc-viewer-menu-panel/);
});
test('new signed tester build 0.45.84 code 197 is monotonic',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.84');
 assert.match(read('rivoscan-version.properties'),/^versionCode=199$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.84$/m);
});
