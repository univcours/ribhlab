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
  "requestPremium('bookScan')","rivo-camera-fab","data-library-chip","home-quick-search",
  "data-id-card-scan","data-live-camera","data-doc-select"]){
  assert.ok(main.includes(token),token);
 }
 for(const token of ['.rivo-premium-hero','.rivo-premium-tile','.rivo-premium-recent',
 '.rivo-library-chips','.rivo-camera-fab','safe-area-inset-bottom']){
  assert.ok(css.includes(token),token);
 }
 assert.ok(text('src/monetization.js').includes('receivedReward'),'reward must be real');
 assert.ok(text('src/scan-editor.js').includes('rivo-editor-retake'));
 assert.ok(text('src/library-bulk.js').includes('data-bulk="delete"'));
});

test('Camera remains a single independent floating action button above four bottom navigation slots',()=>{
 const main=text('src/main.js'),css=text('src/premium-home.css');
 const nav=main.slice(main.indexOf('const mobile = '),main.indexOf('const showFab='));
 assert.equal((nav.match(/<button\b/g)||[]).length,4,'exactly four bottom nav buttons');
 assert.ok(!nav.includes('data-live-camera'),'camera cannot be inside bottom nav');
 const fab=main.slice(main.indexOf('const showFab='),main.indexOf('localizeStaticUI(app'));
 assert.ok(fab.includes("isHome||isDocs||isTools"),'FAB visible only in main screens');
 assert.ok(fab.includes('class="floating-scan rivo-camera-fab" data-live-camera'),'real native scanner action');
 assert.ok(css.includes('bottom:calc(83px + env(safe-area-inset-bottom,0px))'),'FAB above gesture bar');
 assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'four navigation entries');
 assert.ok(css.includes('body.rivo-multiselect')&&css.includes('body:has(.rivo-editor-overlay)'),'overlay safe');
});

test('Premium badges display AD (not countdown/duration), while reward duration stays disclosed at opt-in',()=>{
 const main=text('src/main.js'),copy=text('src/premium-home-model.js'),ads=text('src/monetization.js');
 assert.ok(main.includes('rivo-premium-lock" aria-label="Ad-supported feature">AD'));
 assert.ok(main.includes('rivo-video-access" aria-label="Ad-supported feature">AD'));
 assert.ok(main.includes("unlocked?'ON':'AD'"));
 assert.ok(!main.includes('▶ 10m'));
 assert.ok(!main.includes('10 MIN ·'));
 assert.ok(!main.includes("'10:00'"));
 assert.ok(!copy.includes('10 minutes')&&!copy.includes('10 دقائق'));
 assert.ok(ads.includes('PREMIUM_MINUTES=10'));
 assert.ok(ads.includes('Watch video · 10 minutes'));
});

test('Ad unlock is never mislabeled as Premium or a paid PRO subscription',()=>{
 const main=text('src/main.js'),hub=text('src/tools-hub.js');
 const native=text('native/android/RivoLocale.java'),editor=text('src/scan-editor.js');
 assert.ok(main.includes('aria-label="Ad-supported advanced tools"'));
 assert.ok(main.includes("unlocked?'ON':'AD'"));
 assert.ok(!main.includes('aria-label="Premium tools"'));
 assert.ok(!main.includes("unlocked?'PRO':'AD'"));
 assert.ok(!main.includes("ico('crown',17)} PRO"));
 assert.ok(!hub.includes('Book Scan Pro'));
 assert.ok(!native.includes('Paper Scan Pro'));
 assert.ok(!editor.includes('PerfectScan Pro'));
 assert.ok(text('src/monetization.js').includes('PREMIUM_MINUTES=10'),
   'rewarded video entitlement remains 10 minutes; paid subscriptions are separate');
});
