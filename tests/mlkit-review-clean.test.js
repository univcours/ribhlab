import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mlkitAutoCleanMode,persistMlKitPdf} from '../src/mlkit-scan-flow.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Remove RivoScan post-Google review screen from sources, not just hide it',()=>{
 const main=file('src/main.js'), css=file('src/rivo-design-system.css');
 assert.equal(existsSync(new URL('../src/scan-review.js',import.meta.url)),false);
 assert.ok(!main.includes('openMlKitReview'));
 assert.ok(!main.includes("from './scan-review.js'"));
 assert.ok(!css.includes('rivo-mlkit-review'));
 assert.ok(!css.includes('rivo-review-open'));
 assert.ok(main.includes('const cleanMode=mlkitAutoCleanMode(prefs);'));
 assert.ok(main.includes("perfectClean:cleanMode!=='original'"));
 assert.ok(main.includes('await loadLibrary(false)'));
 assert.ok(main.includes('openLibrary();'));
});

test('Automatic background PerfectClean honors user scanner settings',()=>{
 assert.equal(mlkitAutoCleanMode({autoClean:true,enhancement:'proscan'}),'clean');
 assert.equal(mlkitAutoCleanMode({autoClean:true,enhancement:'bw'}),'bw');
 assert.equal(mlkitAutoCleanMode({autoClean:true,enhancement:'original'}),'original');
 assert.equal(mlkitAutoCleanMode({autoClean:false,enhancement:'proscan'}),'original');
 assert.equal(mlkitAutoCleanMode({}),'clean');
});

test('Native PDF handoff preserves cleanup and original-PDF fallback with no manual edits',async()=>{
 const result={pdf:{uri:'content://google/final.pdf',pageCount:1},scannedImages:['content://google/1.jpg']};
 let request;
 await persistMlKitPdf(result,{perfectClean:true,cleanMode:'bw',importPdf:async x=>{
   request=x;return {uri:'content://media/123',perfectCleanApplied:true};
 }});
 assert.equal(request.cleanMode,'bw');
 assert.equal(request.scannedImages.length,1);
 assert.equal(request.reviewEdits.length,0);
 await persistMlKitPdf(result,{perfectClean:false,cleanMode:'original',importPdf:async x=>{
   request=x;return {uri:'content://media/125'};
 }});
 assert.equal(request.scannedImages,undefined);
 const native=file('native/android/RivoDocumentsPlugin.java');
 assert.ok(native.includes('preserving original Google PDF'));
 assert.ok(native.includes('RivoPerfectClean.createPdf(getContext(),scanned,reviewEdits'));
});
