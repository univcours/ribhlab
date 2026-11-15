import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRecentlySavedDocuments} from '../src/recently-saved-documents.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('first save stays visible immediately when MediaStore returns an empty list',()=>{
 let time=1000000;
 const cache=createRecentlySavedDocuments({clock:()=>time,ttlMs:45000});
 const saved={uri:'content://media/external_primary/file/502',name:'RS_Doc_20261115.pdf',size:11524,mimeType:'application/pdf'};
 assert.equal(cache.remember(saved),true);
 const initial=cache.merge([]);
 assert.equal(initial.length,1);
 assert.equal(initial[0].uri,saved.uri);
 assert.equal(initial[0].size,saved.size);
 assert.equal(initial[0].name,saved.name);
 time+=5000;
 assert.equal(cache.merge([]).length,1,'first scan must not vanish while awaiting MediaStore indexing');
 assert.equal(cache.pendingCount(),1);
});

test('MediaStore query replacing optimistic entry never creates duplicate documents',()=>{
 const cache=createRecentlySavedDocuments();
 const saved={uri:'content://media/external_primary/file/44',name:'Scan.pdf',size:777};
 cache.remember(saved);
 const fromMediaStore={...saved,created:200,mimeType:'application/pdf'};
 const list=cache.merge([fromMediaStore]);
 assert.equal(list.length,1);
 assert.deepEqual(list[0],fromMediaStore,'prefer native canonical metadata');
 assert.equal(cache.pendingCount(),0);
 assert.equal(cache.merge([fromMediaStore]).length,1);
});

test('successful imports, image saves and scan output use the same optimistic cache',()=>{
 const main=read('src/main.js');
 assert.match(main,/libraryItems=recentPublishedDocuments\.merge\(result\.files\)/);
 assert.match(main,/const saved=await persistMlKitPdf\(result,\{/);
 assert.match(main,/recentPublishedDocuments\.remember\(saved\)/);
 assert.match(main,/const importedFile=await RivoDocuments\.saveFile\(/);
 assert.match(main,/recentPublishedDocuments\.remember\(importedFile\)/);
 assert.match(main,/if\(!recentPublishedDocuments\.remember\(saved\)\)throw Error\('Saved document was not committed/);
});

test('unsaved draft, corrupted result and expired cache never look like a saved file',()=>{
 let now=100;
 const cache=createRecentlySavedDocuments({clock:()=>now,ttlMs:3000});
 assert.equal(cache.remember(null),false);
 assert.equal(cache.remember({uri:'',name:'Scan.pdf'}),false);
 assert.equal(cache.remember({uri:'http://example.com/a',name:'Scan.pdf'}),false);
 assert.equal(cache.remember({uri:'content://media/external/file/9',name:''}),false);
 assert.equal(cache.merge([]).length,0);
 assert.equal(cache.remember({uri:'content://media/external/file/9',name:'Scan.pdf'}),true);
 now+=3001;
 assert.deepEqual(cache.merge([]),[]);
 assert.equal(cache.pendingCount(),0);
});

test('many initial captures are bounded in memory and sorted newest first',()=>{
 let now=0;
 const cache=createRecentlySavedDocuments({clock:()=>++now,maxPending:3});
 for(let i=1;i<=5;i++)cache.remember({uri:'content://media/file/'+i,name:'Scan'+i+'.pdf'});
 assert.equal(cache.pendingCount(),3);
 const docs=cache.merge([]);
 assert.deepEqual(docs.map(x=>x.name),['Scan5.pdf','Scan4.pdf','Scan3.pdf']);
});

test('CI tests the real touch editor with synthetic files, never invents camera output',()=>{
 const workflow=read('.github/workflows/rivoscan-standalone-visual.yml');
 const script=read('scripts/edge-loupe-e2e.mjs');
 assert.match(workflow,/node scripts\/edge-loupe-e2e\.mjs/);
 assert.match(workflow,/pull_request:/);
 for(const expected of ['page.mouse.down()','page.mouse.move(cursorX+22,cursorY+18','page.mouse.up()','corner-loupe-pressed.png','corner-loupe-drag.png','__rivoSaved','data-edge="save"']){
  assert.ok(script.includes(expected),expected);
 }
});
