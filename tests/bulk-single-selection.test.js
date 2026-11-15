import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryBulk} from '../src/library-bulk.js';

function setup(){
 const docs=[
  {uri:'content://rivo/document/1',name:'RS_Doc_20261115.pdf',mimeType:'application/pdf'},
  {uri:'content://rivo/document/2',name:'RS_Doc_20261115_2.pdf',mimeType:'application/pdf'}
 ];
 const originalDocument=globalThis.document;
 globalThis.document={
  body:{classList:{toggle(){},remove(){}}},
  getElementById(){return null}
 };
 const instance=createLibraryBulk({
  getLanguage:()=> 'en',getItems:()=>docs,
  bridge:{},toast:()=>{},onRefresh:async()=>{},
  showBusy:()=>{},progress:()=>{},clearBusy:()=>{},saveOut:async()=>{}
 });
 return {docs,instance,reset:()=>{globalThis.document=originalDocument;}};
}

test('toolbar remains above list and is available with one selected file',()=>{
 const fixture=setup();
 try {
  const {instance,docs}=fixture;
  assert.equal(instance.toolbar(),'');
  instance.toggle(docs[0]);
  assert.equal(instance.count(),1);
  assert.match(instance.toolbar(),/data-bulk="delete"/);
  assert.match(instance.toolbar(),/data-bulk="share"/);
  assert.match(instance.toolbar(),/data-bulk="merge"[^>]*disabled aria-disabled="true"/);
  instance.toggle(docs[1]);
  assert.equal(instance.count(),2);
  assert.doesNotMatch(instance.toolbar(),/data-bulk="merge"[^>]*disabled/);
  instance.toggle(docs[0]);
  instance.toggle(docs[1]);
  assert.equal(instance.toolbar(),'');
 }finally{fixture.reset()}
});

test('one selected document retains its checkbox and action names',()=>{
 const fixture=setup();
 try {
  const {instance,docs}=fixture;
  instance.toggle(docs[0]);
  const html=instance.toolbar();
  const names=['cancel','all','delete','organize','merge','share'];
  assert.deepEqual([...html.matchAll(/data-bulk="([^"]+)"/g)].map(m=>m[1]),names);
  assert.match(html,/<svg aria-hidden="true"[^>]*fill="none"/);
  assert.match(instance.checkbox(docs[0],0),/checked/);
  assert.doesNotMatch(instance.checkbox(docs[1],1),/ checked/);
 }finally{fixture.reset()}
});

test('both permanent QR and bar journal filenames are unchanged',async()=>{
 const {scannerDailyFile}=await import('../src/scan-ledger.js');
 assert.equal(scannerDailyFile('QR','2026-11-15'),'RS_QR.txt');
 assert.equal(scannerDailyFile('CODE128','2026-11-16'),'RS_Bar.txt');
});
