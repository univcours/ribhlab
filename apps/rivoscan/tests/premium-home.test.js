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
test('Screenshots navigate actual four slots and reject duplicate documents/tools images',()=>{
 const script=file('scripts/play-store-screenshots.sh');
 assert.ok(script.includes('tap_bottom 71; capture 03-tools'));
 assert.ok(script.includes('tap_bottom 89; capture 04-settings'));
 assert.ok(script.includes('cmp -s'));
 assert.ok(script.includes('local y=$((height-42))'));
 assert.ok(script.includes('did not navigate on the first tap'));
 assert.ok(script.includes('duplicate navigation screenshot'));
});
test('No redundant Home/All Tools link inside Documents; native topbar handles Back',()=>{
 const main=file('src/main.js');
 const library=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary(',main.indexOf('function libraryWorkspace(){')));
 assert.ok(!library.includes('class="back"'));
 assert.ok(main.includes('data-inapp-back'));
});
test('Right-edge Android Back closes page manager, editor and every supported full-screen tool first',()=>{
 const main=file('src/main.js');
 for(const tag of ['rivo-pages-overlay','rivo-editor-overlay','rivo-perfectscan-overlay',
 'rivo-code-overlay','rivo-id-overlay','data-page-action="close"',
 'data-edit="cancel"','data-perfect="close"']){
  assert.ok(main.includes(tag),tag);
 }
 assert.ok(main.includes("start.side==='right'&&dx<=-84"));
 assert.ok(main.includes("document.querySelector('.busy')"));
});
test('Document viewer, file actions and native editors inherit turquoise colors',()=>{
 const css=file('src/compact-turquoise.css');
 for(const name of ['.doc-detail-overlay','.doc-action.doc-edit','.bulk-overlay .bulk-sheet',
 '.rivo-editor-overlay','.rivo-pages-overlay','.rivo-perfectscan-overlay']){
  assert.ok(css.includes(name),name);
 }
});
test('Settings switches, language selector and search icons follow teal system',()=>{
 const css=file('src/compact-turquoise.css');
 for(const marker of ['.rivo-scanner-pref input[type="checkbox"][role="switch"]:checked',
   '.settings-sounds input[type="checkbox"][role="switch"]:checked',
   '.rivo-scanner-pref select','.rivo-tools-search svg','.settings-identity']){
  assert.ok(css.includes(marker),marker);
 }
});
test('Tools/Settings navigation never waits for an ad or asynchronous promise',()=>{
 const main=file('src/main.js');
 const start=main.indexOf("document.querySelectorAll('[data-tab]').forEach(");
 const end=main.indexOf("document.querySelectorAll('[data-inapp-back]')",start);
 const click=main.slice(start,end);
 assert.ok(click.includes('openTab(el.dataset.tab)'));
 assert.ok(!click.includes('await atNaturalNavigation'), 'Tabs must not wait on ads');
 assert.ok(!click.includes('async()=>'), 'Tabbed navigation must be synchronous');
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
