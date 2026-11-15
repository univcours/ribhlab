import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/rivo-stable-scroll-layout.css',import.meta.url),'utf8');
const documentsCSS=readFileSync(new URL('../src/rivo-documents-heading-search.css',import.meta.url),'utf8');
const banner=readFileSync(new URL('../src/rivo-native-banner-layout.css',import.meta.url),'utf8');
const plate=readFileSync(new URL('../src/plate-scanner.js',import.meta.url),'utf8');

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

test('Documents search shares the title row; Import and Folder remain separate accessible actions',()=>{
 const layout=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary('));
 const heading=layout.slice(layout.indexOf('<div class="library-heading rivo-library-clean-header">'),layout.indexOf('<div class="panel library-panel">'));
 assert.match(heading,/\$\{dl\('documents'\)\}/);
 assert.match(heading,/class="rivo-library-title-search"/);
 assert.match(heading,/class="library-search rivo-library-heading-search"/);
 assert.match(heading,/id="library-search"/);
 assert.match(heading,/data-import="file"/);
 assert.doesNotMatch(heading,/data-import="image"/);
 assert.match(heading,/id="open-storage-folder"/);
 assert.match(heading,/id="refresh-documents"/);
 assert.equal((layout.match(/data-import=/g)||[]).length,1,'only one Import button');
 assert.equal((layout.match(/id="open-storage-folder"/g)||[]).length,1);
 assert.match(documentsCSS,/\.rivo-library-title-search/);
 assert.match(documentsCSS,/\.rivo-library-heading-search/);
 assert.match(documentsCSS,/flex-direction:row!important/);
 const override=main.indexOf("import './rivo-documents-heading-search.css'");
 const stable=main.indexOf("import './rivo-stable-scroll-layout.css'");
 assert.ok(override>stable,'new layout must override legacy CSS');
});

test('Documents filters and count retain one row; no duplicated My Files command row',()=>{
 const markup=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary('));
 const filter=markup.slice(markup.indexOf('class="rivo-library-filter-row"'),markup.indexOf('class="library-controls"'));
 assert.match(filter,/class="rivo-library-chips"/);
 assert.match(filter,/class="library-top"/);
 assert.doesNotMatch(markup,/class="rivo-library-command-row/);
 assert.doesNotMatch(markup,/class="storage-actions"/);
 assert.equal((markup.match(/id="library-search"/g)||[]).length,1);
 assert.equal((markup.match(/id="refresh-documents"/g)||[]).length,1);
 assert.ok(css.includes('.rivo-library-filter-row'));
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
 const heading=library.slice(library.indexOf('class="rivo-library-title-search"'),library.indexOf('class="library-heading-actions"'));
 const positions=['<h1>','id="library-search"'].map(token=>heading.indexOf(token));
 assert.ok(positions.every(pos=>pos>0)&&positions[0]<positions[1],
  'Documents must show My Documents immediately before Search in the title row');
 assert.ok(heading.includes('rivo-library-heading-search'));
 assert.ok(!library.includes('class="rivo-library-command-row'));
 for(const selector of ['.rivo-home-search-title-row','.rivo-tools-search-title-row']){
  assert.ok(css.includes(selector),'No shared inline layout CSS for '+selector);
 }
 assert.ok(documentsCSS.includes('.rivo-library-title-search'));
 for(const id of ['home-quick-search','tools-query','library-search']){
  assert.equal((main.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'duplicate search input '+id);
 }
});

test('live license-plate search shares the modal title and close row',()=>{
 assert.match(plate,/header\.append\(title,searchRow,close\)/);
 assert.match(plate,/panel\.append\(header,pinned,view,status,last,foot,hint\)/);
 assert.doesNotMatch(plate,/panel\.append\(header,searchRow,/);
 assert.match(css,/body \.rivo-plate-overlay \.rivo-live-dialog \.rivo-live-head/);
 assert.match(css,/body \.rivo-plate-overlay \.rivo-live-head > \.rivo-plate-search-row/);
});
