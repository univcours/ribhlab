import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quickScanActions,scanHomeCopy,documentCategoryCounts} from '../src/scanner-first-model.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Four quick scan modes all have implemented action attributes',()=>{
 assert.deepEqual(quickScanActions.map(x=>x.id),['document','id','book','gallery']);
 assert.deepEqual(quickScanActions.map(x=>x.attribute),[
  'data-live-camera','data-id-card-scan','data-hub-action="bookScan"','data-import="image"'
 ]);
 assert.equal(quickScanActions.filter(x=>x.ad).length,0);
 for(const lang of ['ar','en','fr','es','de','pt','it']){
  const copy=scanHomeCopy(lang);
  for(const key of ['quick','recent','all','more','document','id','book','gallery','saved'])assert.ok(copy[key]);
  assert.ok(!JSON.stringify(copy).toLowerCase().includes('cloud sync'));
 }
});
test('Document counts reflect actual local file types',()=>{
 const files=[{name:'a.pdf'},{name:'b.png'},{name:'c.docx'},{name:'d.jpg'}];
 const count=documentCategoryCounts(files,doc=>({klass:doc.name.endsWith('.pdf')?'pdf':/\.(jpg|png)$/.test(doc.name)?'image':'doc'}));
 assert.deepEqual(count,{all:4,pdf:1,images:2});
 assert.deepEqual(documentCategoryCounts([],()=>({klass:'pdf'})),{all:0,pdf:0,images:0});
});
test('Home prioritizes scans and documents with extra tools collapsed, keeps floating camera',()=>{
 const main=read('src/main.js'),css=read('src/premium-home.css');
 const home=main.slice(main.indexOf('function home(){'),main.indexOf('function toolsWorkspace(){'));
 for(const token of ['rivo-scan-modes','rivo-scan-file-chips','recentDocuments(8)',
  'rivo-scan-more-tools','data-home-filter','rivo-premium-recent'])assert.ok(home.includes(token),token);
 assert.ok(home.indexOf('rivo-scan-modes')<home.indexOf('home-recents'));
 assert.ok(home.indexOf('home-recents')<home.indexOf('rivo-scan-more-tools'));
 assert.ok(main.includes("document.querySelectorAll('[data-home-filter]')"));
 assert.ok(main.includes('libraryFilter=button.dataset.homeFilter'));
 assert.ok(main.includes('data-live-camera')&&main.includes('rivo-camera-fab'));
 assert.ok(css.includes('grid-template-columns:48px minmax(0,1fr) 34px'));
 assert.ok(css.includes('bottom:calc(26px + env(safe-area-inset-bottom,0px))'));
 assert.ok(!home.includes('Cloud sync'));
 assert.ok(!home.includes('>ADS<'));
});

test('Recent document counts and thumbnails refresh after edits and new scans',()=>{
 const main=read('src/main.js');
 const refresh=main.slice(main.indexOf('function refreshHomeDocuments(){'),
   main.indexOf('const RivoUVDoc =',main.indexOf('function refreshHomeDocuments(){')));
 for(const key of ['recentDocuments(8)','documentCategoryCounts(libraryItems,visualFileType)',
  "document.querySelector('[data-home-recent-count]')",
  "document.querySelectorAll('[data-home-filter]')",'hydrateDocumentThumbnails()']){
  assert.ok(refresh.includes(key),key);
 }
 assert.ok(main.includes('<span data-home-recent-count>'));
 assert.ok(main.includes("else if(!activeTool)refreshHomeDocuments();"));
 assert.match(main,/homeSearchQuery=event\.target\.value;\r?\n\s*refreshHomeDocuments\(\);/);
 assert.ok(main.includes('class="doc-select-box rivo-recent-check"'));
 assert.ok(!main.includes("bulkUI.wireLongPress(el)"));
 assert.ok(!refresh.includes("render();"),'do not reset search or selection by rerendering all');
});
