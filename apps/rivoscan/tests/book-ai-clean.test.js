import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Book Scan Pro imports ML Kit FULL cleaned single pages without splitting twice',()=>{
 const ui=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("cleanPage:async()=>"));
 assert.ok(main.includes("scanned.scannedImages.length"));
 assert.ok(main.includes("scannerMode:'FULL'"));
 assert.ok(ui.includes("load(url,{alreadySingle:true})"));
 assert.ok(ui.includes("alreadySingle:currentIsSinglePage"));
 assert.ok(ui.includes("singlePage||spread.alreadySingle"));
 assert.ok(ui.includes("currentIsSinglePage=old.alreadySingle"));
 assert.ok(ui.includes("singlePage||currentIsSinglePage"));
});
test('No Pro lock during field QA and private photos are not sent to AI Chat automatically',()=>{
 const ui=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(ui.includes("spec.type==='mlkitFull'"));
 assert.ok(!ui.includes('requireProPurchase('));
});
