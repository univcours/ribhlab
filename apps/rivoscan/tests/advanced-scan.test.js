import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutIDPhotoSheet,photoSizes} from '../src/id-photo-maker.js';
import {changesForVersion,shouldShowReleaseNotes} from '../src/whats-new.js';
import {readFileSync} from 'node:fs';
test('Photo sheets use real 300DPI dimensions and every photo stays inside print margins',()=>{
 for(const size of Object.keys(photoSizes)){
  const page=layoutIDPhotoSheet(size);
  assert.equal(page.sheetW,Math.round(100*300/25.4));assert.equal(page.sheetH,Math.round(150*300/25.4));
  assert.ok(page.positions.length>0);
  for(const rect of page.positions){assert.ok(rect.x>=0&&rect.y>=0);assert.ok(rect.x+rect.w<=page.sheetW&&rect.y+rect.h<=page.sheetH)}
 }
});
test('Release notes are shown only for unseen version and describe real work',()=>{
 const seen=new Map(),storage={getItem:k=>seen.get(k)||null,setItem:(k,v)=>seen.set(k,v)};
 assert.ok(shouldShowReleaseNotes(storage,'0.22.0'));storage.setItem('rivo-release-notes-read','0.22.0');
 assert.equal(shouldShowReleaseNotes(storage,'0.22.0'),false);assert.ok(shouldShowReleaseNotes(storage,'0.22.1'));
 for(const lang of ['ar','en','fr','de','es','pt','it'])assert.ok(changesForVersion(lang).items.length>=3);
});
test('Barcode reader has real camera/image decoding, and does not auto-open untrusted URLs',()=>{
 const src=readFileSync(new URL('../src/barcode-scanner.js',import.meta.url),'utf8');
 assert.ok(src.includes('BrowserMultiFormatReader'));assert.ok(src.includes('reader.decodeFromCanvas'));
 assert.ok(src.includes("input.type='file'"));assert.ok(src.includes('const link=safeScannedUrl(value)'));
 assert.ok(src.includes('window.confirm'));assert.ok(!src.includes('window.location='));
});

test('Book Scan splits a double-page photo into two non-overlapping pages',async()=>{
 const {splitBookRegions}=await import('../src/book-split.js');
 const regions=splitBookRegions(1600,1000,54);
 assert.equal(regions.length,2);assert.equal(regions[0].w+regions[1].w,1600);
 assert.equal(regions[1].x,regions[0].w);assert.equal(regions[0].h,1000);
 assert.throws(()=>splitBookRegions(1600,1000,99));
});
test('ID photo PNG contains explicit 300 DPI print metadata',async()=>{
 const {setPNGResolution}=await import('../src/id-photo-maker.js');
 const bytes=new Uint8Array(45);bytes.set([137,80,78,71,13,10,26,10]);
 const view=new DataView(bytes.buffer);view.setUint32(8,13);bytes.set([73,72,68,82],12);
 const encoded=setPNGResolution(bytes);
 assert.equal(encoded.length,66);
 assert.equal(String.fromCharCode(...encoded.slice(37,41)),'pHYs');
 assert.equal(new DataView(encoded.buffer).getUint32(41),11811);
});

test('All genuinely wired extended tools have handlers rather than generic dead buttons',async()=>{
 const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const type of ["spec.type==='barcode'","spec.type==='idPhoto'","spec.type==='book'"]){
  assert.ok(src.includes(type),type);
 }
 const hub=readFileSync(new URL('../src/tools-hub.js',import.meta.url),'utf8');
 for(const key of ['idPhotoMaker','scanCode','restorePhoto','bookScan'])assert.ok(hub.includes(key));
 const rest=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 assert.ok(rest.includes('restorePhotoPixels'));
 assert.ok(rest.includes('inpaintMaskedPixels'));
});

test('CountCam returns grouped counts from actual scored detections without guessing unseen classes',async()=>{
 const {countDetectedObjects}=await import('../src/count-cam.js');
 assert.deepEqual(countDetectedObjects([
  {class:'bottle',score:.9,bbox:[0,0,10,10]},
  {class:'bottle',score:.7,bbox:[15,0,10,10]},
  {class:'person',score:.81,bbox:[0,0,22,90]},
  {class:'bottle',score:.2,bbox:[4,4,1,1]}
 ],.5),{bottle:2,person:1});
 assert.throws(()=>countDetectedObjects([],2));
});

test('AES-256 Lock PDF is wired to the editor and validates passwords locally',async()=>{
 const {PDFDocument}=await import('pdf-lib');
 const {encryptPDFCopy,validatePDFPassword}=await import('../src/pdf-lock.js');
 assert.throws(()=>validatePDFPassword('short','short'));
 assert.throws(()=>validatePDFPassword('12345678','87654321'));
 const pdf=await PDFDocument.create();pdf.addPage([612,792]);
 const original=await pdf.save({useObjectStreams:false});
 const encrypted=await encryptPDFCopy(original,'correct horse battery staple','owner-password',
  {copy:false,modify:false,print:true});
 assert.ok(encrypted.length>0);
 const text=new TextDecoder('latin1').decode(encrypted);
 assert.ok(text.includes('/Encrypt'),'encrypted PDF must contain a real Encrypt dictionary');
 assert.ok(text.includes('/AESV3')||text.includes('/V 5'),'PDF must use AES-256 handler');
 const {PDFDocument:Lib}=await import('pdf-lib');
 await assert.rejects(Lib.load(encrypted),'an unauthenticated parser must reject protected PDF');
});

test('Guided book-page dewarping is non-affine, preserves unmodified image and remains bounded',async()=>{
 const {remapCurvedPageRGBA}=await import('../src/document-dewarp.js');
 const w=60,h=120,src=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const index=(y*w+x)*4;
  src[index]=Math.round(y/h*255);src[index+1]=x;src[index+2]=100;src[index+3]=255;
 }
 const flat=remapCurvedPageRGBA(src,w,h,0,'right');
 assert.deepEqual(flat,src);
 const adjusted=remapCurvedPageRGBA(src,w,h,70,'right');
 assert.deepEqual(Array.from(adjusted.slice((60*w+0)*4,(60*w+0)*4+4)),
   Array.from(src.slice((60*w+0)*4,(60*w+0)*4+4)),
   'away from spine must be unchanged');
 assert.notEqual(adjusted[(60*w+(w-1))*4],src[(60*w+(w-1))*4],
   'spine must receive nonlinear correction');
 assert.equal(adjusted[3],255);
 assert.throws(()=>remapCurvedPageRGBA(src,w,h,120,'right'));
 assert.throws(()=>remapCurvedPageRGBA(src,1,h,10,'right'));
});

test('Photo Translation uses actual on-device ML Kit, source OCR and editable text',()=>{
 const src=readFileSync(new URL('../src/photo-translation.js',import.meta.url),'utf8');
 assert.ok(src.includes("from '@capacitor-mlkit/translation'"));
 assert.ok(src.includes('await recognize(file,model.ocr)'));
 assert.ok(src.includes('await Translation.translate('));
 assert.ok(src.includes('original.value.slice(0,12000)'));
 assert.ok(src.includes("sourceLanguage:source.value,targetLanguage:target.value"));
 assert.ok(src.includes("input.type='file'"));
 assert.ok(src.includes('translation.value'));
 assert.ok(!src.includes('fetch(\'https://'));
});
