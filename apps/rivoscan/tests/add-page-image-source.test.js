import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Add Page is enabled for PDFs and original images, but not unknown files',()=>{
 const bulk=file('src/library-bulk.js');
 assert.ok(bulk.includes('const canAppend=isPDF||isImage(doc)'));
 assert.ok(bulk.includes("canAppend?'':'disabled'"));
});
test('Adding to an original image creates a new PDF with the photo as first page',()=>{
 const source=file('src/main.js');
 assert.ok(source.includes('const sourceIsImage='));
 assert.ok(source.includes('const pdf=sourceIsPDF?await PDFDocument.load(raw):await PDFDocument.create()'));
 assert.ok(source.includes('const imageFile=new File([raw]'));
 assert.ok(source.includes('const firstPage=pdf.addPage([image.width,image.height])'));
 assert.ok(source.includes('firstPage.drawImage(image,'));
 assert.ok(source.includes('pdf.copyPages(incoming,incoming.getPageIndices())'));
 assert.ok(source.includes("replace(/\\.(pdf|jpe?g|png|webp)$/i,'')"));
 assert.ok(source.includes('original document kept unchanged'));
});
test('Add Page still offers camera or import while leaving the original untouched',()=>{
 const source=file('src/main.js');
 assert.ok(source.includes('openLiveScanner({mode:'));
 assert.ok(source.includes('appendToDoc:doc'));
 assert.ok(source.includes("data-add-choice=\"files\""));
 assert.ok(source.includes("data-add-choice=\"camera\""));
 assert.ok(!source.includes("bridge.deleteFile({uri:doc.uri})"));
});
