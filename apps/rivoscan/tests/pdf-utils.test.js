import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePages } from '../src/pdf-utils.js';
test('parses page numbers and ranges',()=>assert.deepEqual(parsePages('1-3, 5,8',10),[0,1,2,4,7]));
test('empty selection means all only when allowed',()=>{assert.deepEqual(parsePages('',3,{allowEmpty:true}),[0,1,2]);assert.throws(()=>parsePages('',3));});
test('rejects out-of-range and invalid pages',()=>{
  for(const val of ['0','4','3-2','1,a','1-999','-1','1.5'])assert.throws(()=>parsePages(val,3));
});
test('rejects duplicate page numbers when reordering',()=>{
  assert.deepEqual(parsePages('3, 1, 2',3,{requireUnique:true}),[2,0,1]);
  assert.throws(()=>parsePages('1,1',3,{requireUnique:true}));
});
test('rejects nonsensical page counts',()=>assert.throws(()=>parsePages('1',0)));
