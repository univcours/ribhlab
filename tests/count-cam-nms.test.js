import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicateDetections,countDetectedObjects} from '../src/count-cam.js';
import {readFileSync} from 'node:fs';
test('Deduplicates overlapping same-class detection candidates without conflating distinct objects',()=>{
 const raw=[
  {class:'bottle',score:.95,bbox:[10,10,100,100]},
  {class:'bottle',score:.79,bbox:[12,12,98,101]},
  {class:'bottle',score:.85,bbox:[210,10,80,80]},
  {class:'person',score:.92,bbox:[10,10,100,100]},
  {class:'bottle',score:.2,bbox:[0,0,-4,40]}
 ];
 const before=JSON.stringify(raw);
 const filtered=deduplicateDetections(raw,.6);
 assert.equal(filtered.length,3);
 assert.deepEqual(countDetectedObjects(filtered,.5),{bottle:2,person:1});
 assert.equal(JSON.stringify(raw),before,'model data is never mutated');
 assert.throws(()=>deduplicateDetections(raw,1));
});
test('Actual camera preview and counts use the same deduplicated detections',()=>{
 const source=readFileSync(new URL('../src/count-cam.js',import.meta.url),'utf8');
 assert.ok(source.includes('const valid=deduplicateDetections(preds.filter'));
 assert.ok(source.includes('draw(valid)'));
 assert.ok(source.includes('countDetectedObjects(valid,.55)'));
});
