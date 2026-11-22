import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),list=read('src/rivo-list-04578.css'),thumb=read('src/rivo-thumbnail-restore-04580.css');
test('0.45.78 document rows and selected-item actions are restored on Home and Documents',()=>{
 assert.match(main,/class="recent-entry rivo-recent-card \$\{chosen/);
 assert.match(main,/class="document-entry \$\{bulkUI\.chosen\(item\)/);
 assert.match(main,/class="rivo-list-open-glyph"/);
 assert.match(main,/const file=visualFileType\(doc\),chosen=bulkUI\.chosen\(doc\),single=chosen&&bulkUI\.count\(\)===1/);
 assert.match(main,/class="rivo-file-quick-actions"/);
 assert.doesNotMatch(main,/function rowDocumentActions\(/);
 assert.doesNotMatch(main,/import '\.\/rivo-inline-actions-04579\.css'/);
 assert.match(list,/grid-template-columns:20px 66px minmax\(0,1fr\) 24px!important/);
});
test('0.45.79 thumbnail look is retained with real PDF first-page image',()=>{
 assert.match(main,/getThumbnail\(\{uri,width:136,height:184\}\)/);
 assert.match(main,/documentThumbnailCache/);
 assert.match(main,/data-thumb-uri=/);
 assert.match(thumb,/width:58px!important/);
 assert.match(thumb,/height:72px!important/);
 assert.match(thumb,/border-radius:5px!important/);
 assert.match(thumb,/object-fit:contain!important/);
 assert.match(main,/import '\.\/rivo-thumbnail-restore-04580\.css'/);
});
test('saved PDFs and photos again preview inside RivoScan',()=>{
 assert.match(main,/return docViewerUI\.open\(doc\)/);
 assert.match(main,/onPreview:doc=>previewSavedDocument\(doc\)/);
 assert.doesNotMatch(main,/data-doc-external=/);
});
test('0.45.80 code 195 is monotonically newer than published 0.45.79',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.80');
 assert.match(read('rivoscan-version.properties'),/^versionCode=195$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.80$/m);
});

test('My Documents uses exactly the 0.45.44 horizontal file row, not the 0.45.78 grid',()=>{
 const docs=main.slice(main.indexOf('function renderLibraryRows('),main.indexOf('function libraryWorkspace('));
 const css=read('src/rivo-mydocs-04544-layout-04580.css');
 assert.match(docs,/class="document-entry \$\{bulkUI\.chosen\(item\)/);
 assert.match(docs,/class="document-description"/);
 assert.match(docs,/class="document-buttons rivo-file-quick-actions"/);
 assert.doesNotMatch(docs,/rivo-list-open-glyph|rivo-file-kind-badge|rivo-row-inline-actions/);
 assert.match(css,/display:flex!important;flex-direction:row!important/);
 assert.match(css,/grid-template-columns:none!important/);
 assert.match(css,/flex-wrap:wrap!important/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/width:58px!important/);
 assert.match(css,/height:72px!important/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(main,/import '\.\/rivo-mydocs-04544-layout-04580\.css'/);
});
