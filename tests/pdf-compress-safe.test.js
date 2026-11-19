import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {compressPdfPreservingContent} from '../src/pdf-compress-safe.js';
import {readFileSync} from 'node:fs';
test('Safe PDF re-encoding keeps form fields and text without rasterizing',async()=>{
 const pdf=await PDFDocument.create(),p=pdf.addPage([595,842]);
 const field=pdf.getForm().createTextField('Invoice reference');
 field.setText('INV-2026-MA');
 field.addToPage(p,{x:100,y:700,width:200,height:24});
 const original=await pdf.save({useObjectStreams:false});
 const output=await compressPdfPreservingContent(original,{requireSmaller:false});
 const reopened=await PDFDocument.load(output);
 assert.equal(reopened.getPageCount(),1);
 assert.equal(reopened.getForm().getTextField('Invoice reference').getText(),'INV-2026-MA');
});
test('Safe compression never returns larger result without opt-in',async()=>{
 const pdf=await PDFDocument.create();pdf.addPage([595,842]);
 const alreadyCompact=await pdf.save({useObjectStreams:true});
 try{
  const compressed=await compressPdfPreservingContent(alreadyCompact);
  assert.ok(compressed.length<alreadyCompact.length);
 }catch(error){assert.match(error.message,/No smaller searchable PDF/);}
});
test('Default compression UI preserves text and image flattening requires explicit choice',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/name="compressionMode"/);
 assert.match(main,/value="preserve" selected/);
 assert.match(main,/mode!=='raster'/);
 assert.match(main,/compressPdfPreservingContent/);
});
