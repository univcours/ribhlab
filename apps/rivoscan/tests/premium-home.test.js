import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumCopy} from '../src/premium-home-model.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Files-first Home keeps camera, search, selection and a large document area',()=>{
 const main=file('src/main.js');
 const home=main.slice(main.indexOf('function home(){'),main.indexOf('function toolsWorkspace(){'));
 for(const token of ['rivo-compact-home','home-quick-search','recentDocuments(14)','home-recents','home-selection-root'])
  assert.ok(home.includes(token),token);
 assert.ok(!home.includes('homeTiles.map('),'all extra features belong under Tools');
 assert.ok(!home.includes('data-premium-unlock'),'no manual advertising buttons');
 assert.ok(main.includes('rivo-camera-fab'));
 assert.ok(main.includes('data-live-camera'));
 assert.ok(main.includes('data-doc-select'));
});
test('File library uses a short icon row only when exactly one file is selected',()=>{
 const main=file('src/main.js'),bulk=file('src/library-bulk.js');
 assert.ok(main.includes('bulkUI.count()===1'));
 for(const action of ['data-doc-open','data-doc-share','data-doc-rename','data-doc-delete'])
  assert.ok(main.includes(action));
 assert.ok(bulk.includes('rivo-compact-selection'));
 assert.ok(bulk.includes('rivo-inline-bulk'));
 assert.ok(bulk.includes('data-bulk="merge"'));
 assert.ok(bulk.includes('data-bulk="cancel"'));
});
test('All extra features live in Tools including QR and plates',()=>{
 const main=file('src/main.js'),tools=file('src/tools-hub.js');
 for(const name of ['scanCode','plateScanner','bookScan','managePages','photoTranslation','toExcel'])
  assert.ok(tools.includes(name),name);
 const home=main.slice(main.indexOf('function home(){'),main.indexOf('function toolsWorkspace(){'));
 assert.ok(!home.includes('data-hub-action'));
 assert.ok(main.includes('openHubAction(id)'));
});
test('Camera FAB remains outside four bottom navigation buttons',()=>{
 const main=file('src/main.js'),css=file('src/premium-home.css');
 const nav=main.slice(main.indexOf('const mobile = '),main.indexOf('const showFab='));
 assert.equal((nav.match(/<button\b/g)||[]).length,4);
 assert.ok(!nav.includes('data-live-camera'));
 assert.ok(main.includes('class="floating-scan rivo-camera-fab" data-live-camera'));
 assert.ok(css.includes('safe-area-inset-bottom'));
});
test('Turquoise density, accessible controls and no overflowing action rows',()=>{
 const css=file('src/compact-turquoise.css');
 for(const token of ['#079b97','minmax(min(100%,155px),1fr)','rivo-compact-selection',
   'flex-wrap:nowrap','rivo-live-overlay','prefers-reduced-motion:reduce',
   'grid-template-columns:repeat(auto-fit','overflow-y:auto']) assert.ok(css.includes(token),token);
 for(const lang of ['ar','en','fr','es','de','pt','it']){
  const c=premiumCopy(lang);assert.ok(c.files);assert.ok(c.search);
 }
});
test('Manual ad badges, test buttons and video unlock are not rendered',()=>{
 const main=file('src/main.js'),ads=file('src/monetization.js');
 assert.ok(!main.includes('rivo-premium-badge'));
 assert.ok(!main.includes('rivo-video-access"'));
 assert.ok(!main.includes('rivo-ad-settings'));
 assert.ok(!main.includes('class="rivo-ai-watch"'));
 assert.ok(ads.includes('export async function requestPremium(_id){return true;}'));
 assert.ok(ads.includes('shouldShowInterstitial'));
 assert.ok(main.includes('data-ad-privacy'),'consent-related privacy access remains available');
});
