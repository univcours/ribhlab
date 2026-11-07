import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeTiles,premiumCopy,premiumClock} from '../src/premium-home-model.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Home shortcuts and all seven locales work',()=>{
 assert.equal(homeTiles.length,9);assert.equal(new Set(homeTiles.map(x=>x.id)).size,9);
 for(const lang of ['en','ar','fr','es','de','pt','it']){
  const c=premiumCopy(lang);assert.equal(c.names.length,9);assert.equal(c.tabs.length,3);
 }
 assert.equal(premiumClock(600000),'10:00');
});
test('No promo ads on Home/Tools, but real contextual reward verification remains',()=>{
 const main=read('src/main.js'),ads=read('src/monetization.js');
 const home=main.slice(main.indexOf('function home(){'),main.indexOf('function toolsWorkspace(){'));
 assert.ok(!home.includes('rivo-ai-compact'));
 assert.ok(!home.includes('>ADS<'));
 assert.ok(!home.includes('rivo-premium-lock'));
 for(const key of ['data-ad-test','data-ad-retry','data-premium-unlock','rivo-video-access" aria-label'])
  assert.ok(!main.includes(key),key);
 assert.ok(ads.includes('requestPremium(){return true;}'));
 assert.ok(!ads.includes('offerReward()'));
 assert.ok(read('src/scan-editor.js').includes('rivo-editor-retake'));
});
test('FAB centered in four-tab nav and safe area',()=>{
 const main=read('src/main.js'),css=read('src/premium-home.css');
 const nav=main.slice(main.indexOf('const mobile = '),main.indexOf('const showFab='));
 assert.equal((nav.match(/<button\b/g)||[]).length,4);
 assert.ok(main.includes('class="floating-scan rivo-camera-fab" data-live-camera'));
 assert.ok(css.includes('bottom:calc(26px + env(safe-area-inset-bottom,0px))'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr) 76px minmax(0,1fr) minmax(0,1fr)'));
});
