import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Flatten tool uses independent single-page preview and exports a one-page PDF',()=>{
 const hub=readFileSync(new URL('../src/tools-hub.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const book=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(hub.includes("documentFlatten:{icon:'file',color:'green',type:'flatten'}"));
 assert.ok(main.includes("singlePage:spec.type==='flatten'"));
 assert.ok(book.includes("singlePage?[[0,0,preview.width,'right']]")||book.includes("singlePage?[[0,0,preview.width,'right']]"));
 assert.ok(book.includes('regions=singlePage?'));
 assert.ok(book.includes('if(!singlePage){ctx.strokeStyle'));
 assert.ok(book.includes('const autoFix=()=>{'));
 assert.ok(book.includes('autoAll.addEventListener'));
 assert.ok(book.includes('showOriginal=!showOriginal'));
});
test('Book mode retains two-page split and right/left independent dewarp logic',async()=>{
 const {splitBookRegions}=await import('../src/book-split.js');
 const r=splitBookRegions(1800,1200,54);
 assert.equal(r.length,2);assert.equal(r[1].x,r[0].w);
 const book=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(book.includes('const parts=singlePage?'));
 assert.ok(book.includes('autoPageWarp=curve;'));
 assert.ok(book.includes('autoLineWarp=line;'));
 assert.ok(book.includes('dewarpBookCanvas(canvas,resolveBookPageCurvature'));
 assert.ok(book.includes('applyLineWarpCanvas(canvas,spread.autoLineWarp[regionIndex])'));
});