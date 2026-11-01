import test from 'node:test';
import assert from 'node:assert/strict';
import {toolGroups,hubSpecial,hubGroupLabel,hubLabel,hubLanguages} from '../src/tools-hub.js';

test('Tools hub contains five functional categories and unique action IDs',()=>{
 assert.deepEqual(toolGroups.map(g=>g.id),['scan','import','convert','edit','utilities']);
 const entries=toolGroups.flatMap(g=>g.entries);
 assert.ok(entries.length>=20);
 assert.equal(entries.length,new Set(entries).size);
 for(const id of ['idcard','toWord','toExcel','toCSV','toPpt','pdfLong','timestamp','whiteboard','managePages','manualErase']){
  assert.ok(entries.includes(id),id+' must be visible');
  assert.ok(hubSpecial[id],id+' must have a functional handler');
 }
});
test('New tools have labels in all seven app languages',()=>{
 for(const lang of hubLanguages()){
  for(const group of toolGroups){assert.ok(hubGroupLabel(lang,group.id));}
  for(const key of Object.keys(hubSpecial))assert.ok(hubLabel(lang,key));
 }
});
test('Advanced tools distinguish OCR CSV and image-only slide conversion',()=>{
 assert.equal(hubSpecial.toCSV.format,'csv');
 assert.equal(hubSpecial.toExcel.format,'xlsx');
 assert.equal(hubSpecial.toPpt.format,'pptx');
 assert.equal(hubSpecial.toWord.format,'word');
 assert.equal(hubSpecial.pdfLong.format,'long');
});
