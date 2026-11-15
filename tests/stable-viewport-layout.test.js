import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/rivo-stable-scroll-layout.css',import.meta.url),'utf8');
const banner=readFileSync(new URL('../src/rivo-native-banner-layout.css',import.meta.url),'utf8');

test('stable viewport rules are imported after native ad layout and legacy CSS',()=>{
 const native=main.indexOf("import './rivo-native-banner-layout.css'");
 const stable=main.indexOf("import './rivo-stable-scroll-layout.css'");
 assert.ok(native>0 && stable>native,'unified rules must have last-word specificity');
});

test('all primary Android screens have independently scrolling data sections',()=>{
 for(const cls of ['rivo-tools-scroll','rivo-settings-scroll','rivo-scan-scroll']){
  assert.match(main,new RegExp('class="'+cls+'" tabindex="0"'),'missing scroll region '+cls);
  assert.match(css,new RegExp('\\.'+cls),'missing CSS layout '+cls);
 }
 assert.match(main,/id="library-list" class="library-list" tabindex="0"/);
 assert.match(main,/id="home-recents" tabindex="0"/);
});

test('library list occupies remaining height with no hard-coded viewport subtraction',()=>{
 assert.match(css,/\.library-workspace #library-list\.library-list\s*\{/);
 assert.match(css,/flex:1 1 0!important/);
 assert.match(css,/max-height:none!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/\.library-heading-actions/);
 assert.match(css,/\.library-search/);
});

test('native Google banner remains outside scrollable content and is never faked',()=>{
 assert.match(banner,/bottom:var\(--rivo-content-bottom/);
 assert.match(css,/body\.rivo-native-android/);
 assert.match(css,/\.content\s*\{/);
 assert.doesNotMatch(css,/\.rivo-ad-banner-slot\s*\{/);
 assert.doesNotMatch(css,/\.rivo-ad-banner-frame\s*\{/);
});

test('Documents title and its two actions share a single compact header row',()=>{
 const layout=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary('));
 const heading=layout.slice(layout.indexOf('<div class="library-heading">'),layout.indexOf('<div class="panel library-panel">'));
 assert.match(heading,/My Documents|\$\{dl\('documents'\)\}/);
 assert.match(heading,/data-import="image"/);
 assert.match(heading,/id="open-storage-folder"/);
 assert.equal((layout.match(/id="open-storage-folder"/g)||[]).length,1);
 assert.match(css,/\.library-workspace \.library-heading\s*\{[\s\S]*?flex-direction:row!important/);
 assert.match(css,/\.library-heading-actions > button\.btn/);
 assert.match(layout,/data-import="file"/,'File import still available in library controls');
});

test('Documents filters and file count share one row, file import and search share another',()=>{
 const markup=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary('));
 const filter=markup.slice(markup.indexOf('class="rivo-library-filter-row"'),markup.indexOf('class="rivo-library-command-row"'));
 const commands=markup.slice(markup.indexOf('class="rivo-library-command-row"'),markup.indexOf('class="library-controls"'));
 assert.match(filter,/class="rivo-library-chips"/);
 assert.match(filter,/class="library-top"/);
 assert.match(commands,/data-import="file"/);
 assert.match(commands,/id="refresh-documents"/);
 assert.match(commands,/id="library-search"/);
 for(const cls of ['rivo-library-filter-row','rivo-library-command-row']){
  assert.ok(css.includes('.'+cls),'missing responsive horizontal layout for '+cls);
 }
 assert.equal((markup.match(/id="library-search"/g)||[]).length,1);
 assert.equal((markup.match(/id="refresh-documents"/g)||[]).length,1);
});

test('every top-level search is inline with its page label on phones and tablets',()=>{
 const home=main.slice(main.indexOf('function home(){'),main.indexOf('function toolsWorkspace(){'));
 const tools=main.slice(main.indexOf('function toolsWorkspace(){'),main.indexOf('function scannerPreferenceRows(){'));
 const library=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary('));
 assert.match(home,/class="rivo-search-title-row rivo-home-search-title-row"/);
 assert.match(home,/class="rivo-home-intro"><h1>[^\n]*<\/h1><\/div>\s*<label class="rivo-premium-search">/);
 assert.match(home,/id="home-quick-search"/);
 assert.match(tools,/class="rivo-search-title-row rivo-tools-search-title-row"/);
 assert.match(tools,/class="rivo-tools-heading"><h1>[^\n]*<\/h1><\/div>\s*<label class="rivo-tools-search">/);
 assert.match(tools,/id="tools-query"/);
 const command=library.slice(library.indexOf('class="rivo-library-command-row rivo-search-title-row"'),library.indexOf('class="library-controls"'));
 const positions=['data-import="file"','id="library-search"','id="refresh-documents"'].map(token=>command.indexOf(token));
 assert.ok(positions.every(pos=>pos>0)&&positions[0]<positions[1]&&positions[1]<positions[2],
  'Documents must show My Files, then Search, then Refresh in one horizontal row');
 for(const selector of ['.rivo-home-search-title-row','.rivo-tools-search-title-row','.rivo-library-command-row']){
  assert.ok(css.includes(selector),'No shared inline layout CSS for '+selector);
 }
 for(const id of ['home-quick-search','tools-query','library-search']){
  assert.equal((main.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'duplicate search input '+id);
 }
});
