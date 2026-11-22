import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js');
const transparent=read('src/rivo-list-04578.css');
const inline=read('src/rivo-inline-actions-04579.css');
const viewer=read('src/document-viewer.js');

test('Home and My Documents use same compact list row + inline file actions',()=>{
 assert.match(main,/id="home-recents"/);
 assert.match(main,/id="library-list"/);
 assert.match(main,/class="recent-entry rivo-recent-card rivo-document-list-row/);
 assert.match(main,/class="document-entry rivo-document-list-row/);
 assert.match(main,/function rowDocumentActions\(doc,index\)/);
 assert.equal((main.match(/rowDocumentActions\((?:doc|item),index\)/g)||[]).length,2);
 assert.match(main,/class="rivo-file-line-heading"/);
 assert.match(inline,/grid-template-columns:18px 60px minmax\(0,1fr\)/);
 assert.match(inline,/flex-direction:row!important/);
 assert.match(inline,/rivo-row-inline-actions/);
});

test('true first-page thumbnails and accessible button labels retained',()=>{
 assert.match(main,/getThumbnail\(\{uri,width:136,height:184\}\)/);
 assert.match(main,/data-thumb-uri=/);
 assert.match(main,/documentThumbnailCache/);
 assert.match(main,/data-doc-external/);
 assert.match(main,/data-doc-share/);
 const native=read('native/android/RivoDocumentsPlugin.java');
 assert.match(native,/PdfRenderer\.Page page=render\.openPage\(0\)/);
 assert.match(native,/resolver\.loadThumbnail\(uri/);
 assert.match(transparent,/object-fit:contain!important/);
});

test('eye preview is external (original Android app chooser), not RivoScan internal viewer',()=>{
 assert.match(main,/async function previewSavedDocument\(doc\)/);
 assert.match(main,/return RivoDocuments\.openFile\(\{uri:doc\.uri\}\)/);
 assert.match(main,/type==='open'\)await previewSavedDocument\(selected\)/);
 assert.match(main,/onPreview:doc=>previewSavedDocument\(doc\)/);
 assert.match(main,/data-doc-external=/);
 assert.doesNotMatch(main,/return docViewerUI\.open\(doc\)/);
 // Internal viewer still exists for other direct editing workflows.
 assert.match(viewer,/doc-detail-actions/);
});

test('overflow menu preserves rename, delete, edge and shield actions on same file',()=>{
 assert.match(main,/class="rivo-row-more"/);
 assert.match(main,/data-doc-rename=/);
 assert.match(main,/data-doc-delete=/);
 assert.match(main,/data-doc-edges=/);
 assert.match(main,/data-doc-shield=/);
 assert.match(main,/async function renameSavedDocument\(doc\)/);
 assert.match(main,/void renameSavedDocument\(doc\)/);
 assert.match(main,/e\.target\.closest\('summary/);
 assert.match(inline,/rivo-row-more-panel/);
});

test('transparent faces and uniformly slow 28-second faint glow preserved',()=>{
 assert.match(transparent,/background:transparent!important/);
 assert.match(transparent,/--rivo-soft-orbit-speed:28s/);
 assert.match(transparent,/--rivo-soft-orbit-strength:\.28/);
 assert.match(transparent,/animation:rivoEdgeOrbit var\(--rivo-soft-orbit-speed\) linear infinite!important/);
 assert.match(transparent,/prefers-reduced-motion:reduce/);
});

test('release version monotonically increases and loads final styling',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.79');
 assert.match(read('rivoscan-version.properties'),/^versionCode=194$/m);
 assert.match(main,/import '\.\/rivo-inline-actions-04579\.css'/);
});
