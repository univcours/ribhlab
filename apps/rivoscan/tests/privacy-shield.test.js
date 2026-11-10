import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeRedaction,redactCanvas} from '../src/privacy-shield.js';
const code=readFileSync(new URL('../src/privacy-shield.js',import.meta.url),'utf8');
test('Privacy Shield clips normalized masks to an immutable page coordinate space',()=>{
 assert.deepEqual(normalizeRedaction({x1:.8,y1:.7,x2:.2,y2:.3}),{x:.2,y:.3,w:.6000000000000001,h:.39999999999999997});
 assert.equal(normalizeRedaction({x1:0,y1:0,x2:0,y2:0}),null);
 assert.equal(normalizeRedaction({x1:NaN,y1:0,x2:1,y2:1}),null);
 const r=normalizeRedaction({x1:-2,y1:-2,x2:3,y2:3});
 assert.deepEqual(r,{x:0,y:0,w:1,h:1});
});
test('Black masking writes pixels and restores the canvas state',()=>{
 const calls=[],ctx={save(){calls.push('save')},restore(){calls.push('restore')},
 fillRect(...args){calls.push(args)},set fillStyle(x){calls.push(x)}};
 redactCanvas(ctx,[{x:.1,y:.2,w:.3,h:.4}],100,200);
 assert.deepEqual(calls[0],'save');
 assert.equal(calls[1],'#000000');
 assert.deepEqual(calls[2],[10,40,32,82]);
 assert.equal(calls[3],'restore');
});
test('Every PDF page is rasterized into a new PDF, with no original objects carried forward',()=>{
 for(const marker of ['PDFDocument.create()','newPdf.addPage','newPdf.embedJpg','getDocument({data:bytes.slice()',
 'redactCanvas(ct,masks.get(n)||[]','await onSave(await newPdf.save()',
 "masks.get(page)||[]","if(!total)","if(!window.confirm(t.confirm))return"])
  assert.ok(code.includes(marker),marker);
 assert.ok(!code.includes('PDFDocument.load('),'never copy original PDF objects including hidden text');
 assert.ok(!code.includes('drawRectangle('),'overlay-only PDF redaction is reversible');
 assert.ok(code.includes('MAX_PDF_PAGES=30'));
 assert.ok(code.includes('MAX_BYTES=24*1024*1024'));
});
