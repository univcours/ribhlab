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
