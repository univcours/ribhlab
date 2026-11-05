import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeTiles,premiumCopy,premiumClock} from '../src/premium-home-model.js';
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Approved dashboard routes all 9 tiles to implemented tool actions',()=>{
 assert.equal(homeTiles.length,9);
 assert.equal(homeTiles.filter(t=>t.featured).length,1);
 assert.equal(new Set(homeTiles.map(t=>t.id)).size,9);
 assert.ok(homeTiles.every(t=>/^data-(live-camera|import|id-card-scan|hub-action|tool)/.test(t.action)));
 assert.equal(homeTiles[0].action,'data-live-camera');
});
test('Premium card remains honest and is translated into 7 languages',()=>{
 for(const lang of ['ar','en','fr','es','de','pt','it']){
  const c=premiumCopy(lang);
  for(const key of ['hero','body','watch','active','web','tiles','files','search'])
   assert.ok(c[key],lang+' missing '+key);
  assert.equal(c.names.length,9);
  assert.equal(c.tabs.length,3);
 }
 assert.equal(premiumClock(600000),'10:00');
 assert.equal(premiumClock(61500),'01:02');
 assert.equal(premiumClock(0),'00:00');
});
test('Premium dashboard keeps saved-file UX, native camera, rewards and Retake',()=>{
 const main=text('src/main.js'),css=text('src/premium-home.css');
 for(const token of ["import './premium-home.css'","homeTiles.map(","data-premium-unlock",
  "requestPremium('bookScan')","rivo-mobile-capture","data-library-chip","home-quick-search",
  "data-id-card-scan","data-live-camera","data-doc-select"]){
  assert.ok(main.includes(token),token);
 }
 for(const token of ['.rivo-premium-hero','.rivo-premium-tile','.rivo-premium-recent',
 '.rivo-library-chips','.rivo-mobile-capture','safe-area-inset-bottom']){
  assert.ok(css.includes(token),token);
 }
 assert.ok(text('src/monetization.js').includes('receivedReward'),'reward must be real');
 assert.ok(text('src/scan-editor.js').includes('rivo-editor-retake'));
 assert.ok(text('src/library-bulk.js').includes('data-bulk="delete"'));
});
