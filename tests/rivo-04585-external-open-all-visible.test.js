import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),bulk=read('src/library-bulk.js'),css=read('src/rivo-file-actions-unclipped-04585.css'),native=read('native/android/RivoDocumentsPlugin.java');

test('eye button, in-app file previews and linked More/zoom windows are removed',()=>{
 assert.equal(existsSync(new URL('../src/document-viewer.js',import.meta.url)),false);
 for(const fragment of ['createDocumentViewer','docViewerUI','previewSavedDocument','doc-detail-overlay'])
  assert.equal(main.includes(fragment),false,'Embedded document preview remains: '+fragment);
 const row=main.split('function renderSavedFileRow(item,index)')[1].split('function recentDocuments(')[0];
 assert.equal(row.includes("ico('eye'"),false);
 assert.ok(row.includes("ico('external',17)"));
 assert.ok(row.includes('data-doc-external'));
});
test('external Android file viewer is a working accessible native ACTION_VIEW chooser',()=>{
 assert.ok(main.includes('async function openSavedDocumentExternally(doc)'));
 assert.ok(main.includes('return RivoDocuments.openFile({uri:doc.uri})'));
 assert.ok(main.includes("type==='open')await openSavedDocumentExternally(selected)"));
 assert.ok(native.includes('new Intent(Intent.ACTION_VIEW)'));
 assert.ok(native.includes('open.setDataAndType(uri, mimeOf(uri))'));
 assert.ok(native.includes('Intent.createChooser(open, localized("openDocument"))'));
 assert.ok(native.includes('android.content.ClipData.newUri('));
 assert.ok(native.includes('FLAG_GRANT_READ_URI_PERMISSION'));
});
test('all six Phosphor actions fit beside the same thumbnail, in both lists',()=>{
 assert.ok(main.includes("import './rivo-file-actions-unclipped-04585.css'"));
 const row=main.split('function renderSavedFileRow(item,index)')[1].split('function recentDocuments(')[0];
 const commands=['data-doc-external','data-doc-shield','data-doc-edges','data-doc-share','data-doc-rename','data-doc-delete'];
 let previous=-1;
 for(const cmd of commands){const x=row.indexOf(cmd);assert.ok(x>previous,'Missing or misplaced: '+cmd);previous=x;}
 assert.ok(css.includes(':is(#home-recents,#library-list)'));
 assert.ok(css.includes('grid-template-columns:repeat(3,30px)!important'));
 assert.ok(css.includes('grid-template-rows:repeat(2,31px)!important'));
 assert.ok(css.includes('grid-template-columns:repeat(3,27px)!important'));
 assert.ok(css.includes('grid-template-columns:repeat(2,27px)!important'));
 assert.ok(css.includes('overflow-x:visible!important'));
 assert.ok(main.includes('getThumbnail({uri,width:136,height:184})'));
 assert.ok(main.includes('data-thumb-uri'));
});
test('long-hold action listeners absent, native context menus suppressed without breaking checkboxes',()=>{
 assert.equal(/function (wireLongPress|longPress)\(/.test(bulk),false);
 assert.equal(main.includes('bulkUI.wireLongPress'),false);
 assert.ok(main.includes("el?.addEventListener('contextmenu'"));
 assert.ok(main.includes('e.preventDefault()'));
 assert.ok(main.includes('bulkUI.toggle(libraryItems[Number(target.dataset.docSelect)])'));
 assert.ok(css.includes('-webkit-touch-callout:none!important'));
});
test('release version is monotonic with intact native portrait lock',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.95');
 assert.ok(read('rivoscan-version.properties').includes('versionCode=210'));
 assert.ok(read('scripts/prepare-rivoscan-compact.py').includes('android:screenOrientation="portrait"'));
});
