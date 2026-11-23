import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js'),style=read('src/rivo-list-04578.css');
const viewer=read('src/document-viewer.js');
test('Home and My Documents are accessible content-first list rows',()=>{
 assert.match(main,/id="home-recents"/);
 assert.match(main,/id="library-list"/);
 assert.match(style,/display:grid!important/);
 assert.match(style,/grid-template-columns:20px 66px minmax\(0,1fr\) 24px!important/);
 assert.match(main,/function renderSavedFileRow\(item,index\)/);
 assert.match(main,/class="document-entry recent-entry rivo-recent-card/);
 assert.match(main,/data-doc-open="\$\{index\}"/);
});
test('real native first-page thumbnails, not fabricated file-type previews',()=>{
 assert.match(main,/getThumbnail\(\{uri,width:136,height:184\}\)/);
 assert.match(main,/data-thumb-uri=/);
 assert.match(main,/documentThumbnailCache/);
 const native=read('native/android/RivoDocumentsPlugin.java');
 assert.match(native,/PdfRenderer\.Page page=render\.openPage\(0\)/);
 assert.match(native,/resolver\.loadThumbnail\(uri/);
 assert.match(style,/object-fit:contain!important/);
});
test('tapping a saved PDF or photo opens IN-app viewer with persistent actions',()=>{
 assert.match(main,/async function previewSavedDocument\(doc\)/);
 assert.match(main,/return docViewerUI\.open\(doc\)/);
 assert.match(main,/type==='open'\)await previewSavedDocument\(selected\)/);
 assert.match(main,/onPreview:doc=>previewSavedDocument\(doc\)/);
 assert.match(main,/return RivoDocuments\.openFile\(\{uri:doc\.uri\}\)/);
 for(const action of ['doc-action-scan','doc-action-convert','doc-edit','doc-action-danger','doc-edit-options','doc-page-thumbnails']){
  assert.ok(viewer.includes(action),action+' must stay available in the viewer');
 }
});
test('all card faces transparent, glow subdued and same slow speed',()=>{
 assert.match(style,/background:transparent!important/);
 assert.match(style,/background-image:none!important/);
 assert.match(style,/--rivo-soft-orbit-speed:28s/);
 assert.match(style,/--rivo-soft-orbit-strength:\.28/);
 assert.match(style,/animation:rivoEdgeOrbit var\(--rivo-soft-orbit-speed\) linear infinite!important/);
 assert.match(style,/animation-delay:-11s!important/);
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(style,/animation:rivoEdgeOrbit 5\.8s/);
});
test('new branch does not reuse older Play version code',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.82');
 assert.match(read('rivoscan-version.properties'),/^versionCode=197$/m);
 assert.match(main,/import '\.\/rivo-list-04578\.css'/);
 assert.match(main,/import '\.\/rivo-thumbnail-restore-04580\.css'/);
});
