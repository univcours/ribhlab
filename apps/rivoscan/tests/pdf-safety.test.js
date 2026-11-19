import test from 'node:test';
import assert from 'node:assert/strict';
import {safePdfRenderScale} from '../src/pdf-safety.js';
test('Rendering oversized PDF pages stays within bounded bitmap allocations',()=>{
 const scale=safePdfRenderScale(25000,20000,2);
 assert.ok(25000*20000*scale*scale<=9_000_001);
 assert.ok(25000*scale<=4096);
 assert.equal(safePdfRenderScale(595,842,1.5),1.5);
});
test('Malformed PDF dimensions fail before allocating a canvas',()=>{
 for(const args of [[NaN,800,1],[600,0,1],[600,800,-1],[Infinity,842,1]])
  assert.throws(()=>safePdfRenderScale(...args));
});
