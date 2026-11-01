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
