import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safePdfRenderScale} from '../src/pdf-safety.js';
test('OCR PDF-to-Excel rendering never requests unbounded bitmaps',()=>{
 const source=readFileSync(new URL('../src/tool-exports.js',import.meta.url),'utf8');
 assert.match(source,/safePdfRenderScale\(original\.width,original\.height,1\.4\)/);
 const scale=safePdfRenderScale(35000,27000,1.4);
 assert.ok(35000*27000*scale*scale<=9_000_001);
});
