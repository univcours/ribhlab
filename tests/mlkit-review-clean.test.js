import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultCorners,validateCorners} from '../src/scan-review.js';
import {persistMlKitPdf} from '../src/mlkit-scan-flow.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('crimson corner editor accepts valid convex geometry only',()=>{
 assert.equal(validateCorners(defaultCorners()),true);
 assert.equal(validateCorners([[0,0],[1,0],[0,1],[1,1]]),false);
 assert.equal(validateCorners([[-1,0],[1,0],[1,1],[0,1]]),false);
 assert.equal(validateCorners([[.1,.1],[.3,.1],[.3,.2],[.1,.2]]),false);
});
test('Google camera flows into real editable review, preview and native crop',()=>{
 const main=file('src/main.js'), review=file('src/scan-review.js');
 const native=file('native/android/RivoDocumentsPlugin.java'),clean=file('native/android/RivoPerfectClean.java');
 assert.ok(main.includes('review=await openMlKitReview('));
 assert.ok(main.includes('if(!review)return;'));
 assert.ok(review.includes('data-review-corner'));
 assert.ok(review.includes('data-review-compare'));
 assert.ok(review.includes('data-review-save'));
 assert.ok(native.includes('RivoPerfectClean.preview(getContext(),input,quad,mode)'));
 assert.ok(native.includes('RivoPerfectClean.createPdf(getContext(),scanned,reviewEdits'));
 assert.ok(clean.includes('transform.setPolyToPoly(source,0,target,0,4)'));
 assert.ok(clean.includes('if(diff>=22)continue'));
});
test('native PDF handoff saves cleaned, B&W or edited original; unedited originals stay Google PDF',async()=>{
 const result={pdf:{uri:'content://google/final.pdf',pageCount:1},scannedImages:['content://google/1.jpg']};
 let payload;
 await persistMlKitPdf(result,{perfectClean:true,cleanMode:'bw',reviewEdits:[null],importPdf:async x=>{payload=x;return {uri:'content://media/123',perfectCleanApplied:true}}});
 assert.equal(payload.cleanMode,'bw');
 assert.equal(payload.scannedImages.length,1);
 await persistMlKitPdf(result,{perfectClean:false,cleanMode:'original',reviewEdits:[[.02,.02,.98,.02,.98,.98,.02,.98]],importPdf:async x=>{payload=x;return {uri:'content://media/124'}}});
 assert.equal(payload.reviewEdits[0].length,8);
 await persistMlKitPdf(result,{perfectClean:false,cleanMode:'original',reviewEdits:[null],importPdf:async x=>{payload=x;return {uri:'content://media/125'}}});
 assert.equal(payload.scannedImages,undefined);
 assert.ok(file('native/android/RivoDocumentsPlugin.java').includes('preserving original Google PDF'));
});
