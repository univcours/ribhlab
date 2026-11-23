import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),native=read('native/android/RivoDocumentsPlugin.java');

test('the obsolete in-app document viewer was actually removed from the app',()=>{
 assert.equal(existsSync(new URL('../src/document-viewer.js',import.meta.url)),false);
 for(const forbidden of ['createDocumentViewer','docViewerUI','previewSavedDocument','doc-detail-overlay'])
  assert.equal(main.includes(forbidden),false,forbidden);
 assert.equal(main.includes("ico('eye',17)"),false);
});
test('opening a saved file uses a real Android external-app chooser',()=>{
 assert.ok(main.includes('openSavedDocumentExternally'));
 assert.ok(main.includes('RivoDocuments.openFile({uri:doc.uri})'));
 assert.ok(main.includes('data-doc-external'));
 assert.ok(native.includes('new Intent(Intent.ACTION_VIEW)'));
 assert.ok(native.includes('Intent.createChooser(open, localized("openDocument"))'));
 assert.ok(native.includes('FLAG_GRANT_READ_URI_PERMISSION'));
});
test('external-open button is localized and remains identical on Home and Documents',()=>{
 const start=main.indexOf('function externalOpenLabel()');
 const end=main.indexOf('function renderSavedFileRow(',start);
 assert.ok(start>=0&&end>start);
 const labels=main.slice(start,end);
 for(const lang of ['ar','en','fr','es','de','pt','it'])
  assert.ok(labels.includes(lang+':'), 'Missing language '+lang);
 assert.ok(main.includes('matched.map(({doc,index})=>renderSavedFileRow(doc,index))'));
 assert.ok(main.includes('matched.map(({item,index})=>renderSavedFileRow(item,index))'));
});
