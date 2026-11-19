import test from 'node:test';
import assert from 'node:assert/strict';
import {readPlateZoomRange,boundPlateZoom,planPlateAutoZoom,plateSearchRoi,applyPlateZoom} from '../src/plate-distance.js';
test('Auto zoom: camera-supported ranges, limits and hardware confirmation',async()=>{
 assert.equal(readPlateZoomRange({},{}),null);
 assert.equal(readPlateZoomRange({zoom:{min:1,max:1,step:.1}}),null);
 const r=readPlateZoomRange({zoom:{min:1,max:20,step:.1}},{zoom:1});
 assert.deepEqual(r,{min:1,max:6,step:.1,current:1});
 assert.equal(boundPlateZoom(300,r),6);
 assert.equal(boundPlateZoom(.1,r),1);
 assert.equal(boundPlateZoom(1.26,r),1.3);
 let actual=1,requested=null;
 const track={getSettings:()=>({zoom:actual}),applyConstraints:async x=>{requested=x;actual=x.advanced[0].zoom;}};
 assert.equal(await applyPlateZoom(track,r,2.45),2.5);
 assert.equal(requested.advanced[0].zoom,2.5);
 await assert.rejects(applyPlateZoom({getSettings:()=>({zoom:1}),applyConstraints:async()=>{}},r,3),/did not apply/);
 await assert.rejects(applyPlateZoom({applyConstraints:async()=>{throw Error('unsupported')}},r,2),/unsupported/);
});
test('Auto-zoom waits for failed searches and focus settling, resets at max',()=>{
 const range={min:1,max:6,step:.1,current:1};
 assert.equal(planPlateAutoZoom({range,current:1,misses:3,elapsedMs:5000}),null);
 assert.equal(planPlateAutoZoom({range,current:1,misses:10,elapsedMs:400}),null);
 assert.equal(planPlateAutoZoom({range,current:1,misses:4,elapsedMs:2600}),1.6);
 assert.equal(planPlateAutoZoom({range,current:4,misses:4,elapsedMs:2600}),6);
 assert.equal(planPlateAutoZoom({range,current:6,misses:7,elapsedMs:2600}),null);
 assert.equal(planPlateAutoZoom({range,current:6,misses:12,elapsedMs:2600}),1);
 assert.equal(planPlateAutoZoom({range:null,current:1,misses:100,elapsedMs:10000}),null);
});
test('Far plates search wide, left, right and centre without out-of-bounds crops',()=>{
 const regions=Array.from({length:4},(_,i)=>plateSearchRoi(2304,1296,i));
 for(const r of regions)assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=2304&&r.y+r.h<=1296&&r.w>0&&r.h>0);
 assert.ok(regions[0].w>regions[1].w);
 assert.ok(regions[1].x<regions[2].x);
 assert.ok(regions[3].w>regions[1].w);
 assert.throws(()=>plateSearchRoi(0,1080,0),/Invalid camera frame/);
});
