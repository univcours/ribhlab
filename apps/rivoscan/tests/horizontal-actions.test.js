import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('single file icons are delegated, not decoration',()=>{
 const main=read('src/main.js'),bulk=read('src/library-bulk.js');
 for(const action of ['share','edit','preview','rename','delete','add']){
  assert.ok(bulk.includes('data-doc-'+action+'='),action);
  assert.ok(main.includes('data-doc-'+action),action);
 }
 assert.ok(main.includes('bulkUI.editOne(doc)'));
 assert.ok(main.includes('bulkUI.renameOne(doc)'));
 assert.ok(main.includes('choosePagesToAppend(doc)'));
 assert.ok(main.includes("document.querySelector('.doc-action.doc-rename')?.click()"));
 assert.ok(read('src/document-viewer.js').includes("'doc-action doc-rename',rename"));
});
test('adding pages creates PDF and keeps original backup',()=>{
 const m=read('src/main.js');
 assert.ok(m.includes('appendToLibraryPdf(doc,addedFiles)'));
 assert.ok(m.includes('PDFDocument.load(base64ToBytes(original.base64))'));
 assert.ok(m.includes('pdf.copyPages(incoming,incoming.getPageIndices())'));
 assert.ok(m.includes("'_AddedPages_'+Date.now()+'.pdf'"));
 assert.ok(m.includes('Scan more pages'));
});
test('camera approval includes a real + Add Page and batch mode',()=>{
 const n=read('native/android/RivoLiveScannerActivity.java');
 assert.ok(n.includes('Button confirm=button("✓",this::approveCapturedPhoto)'));
 assert.ok(n.includes('showPostSaveChoices()'));
 assert.ok(n.includes('.setNegativeButton(add,'));
});
test('bumped build to distinguish previous installed APK',()=>{
 assert.ok(read('rivoscan-version.properties').includes('versionCode=98'));
 assert.equal(JSON.parse(read('package.json')).version,'0.44.22');
});
