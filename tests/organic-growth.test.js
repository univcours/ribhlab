import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewEligible,recordGrowthSave,growthCopy,PLAY_URL} from '../src/organic-growth.js';
const d=86400000;
test('review only after meaningful use; no sentiment, rewards or repeated requests',()=>{
 const now=100*d;
 assert.equal(reviewEligible({first:now-3*d,count:2},now),false);
 assert.equal(reviewEligible({first:now-d,count:5},now),false);
 assert.equal(reviewEligible({first:now-3*d,count:3},now),true);
 assert.equal(reviewEligible({first:now-3*d,count:3,attempt:now-d},now),false);
 assert.equal(reviewEligible({first:now-93*d,count:3,attempt:now-91*d},now),true);
});
test('successful saves count locally and all seven share labels are available',()=>{
 const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 recordGrowthSave(s,100);recordGrowthSave(s,200);const state=JSON.parse(m.values().next().value);
 assert.equal(state.count,2);assert.equal(state.first,100);
 for(const l of ['en','fr','ar','es','de','pt','it'])assert.equal(growthCopy(l).length,4);
 assert.match(PLAY_URL,/id=com\.ribhlab\.rivoscan$/);
});
