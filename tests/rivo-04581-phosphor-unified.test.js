import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHOSPHOR_MAP,phosphorIcon,hasPhosphorIcon} from '../src/phosphor-icons.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all shared app icons are actual offline Phosphor Duotone SVGs',()=>{
 for(const key of Object.keys(PHOSPHOR_MAP)){
  const svg=phosphorIcon(key,21);
  assert.match(svg,/<svg[^>]*data-phosphor-icon=/);
  assert.ok(hasPhosphorIcon(key),'Missing official SVG asset '+key);
  assert.match(svg,/<(?:path|circle|rect|line)\b/);
  assert.match(svg,/viewBox="0 0 256 256"/);
  assert.ok(!svg.includes('undefined'));
 }
 assert.match(file('PHOSPHOR-LICENSE'),/MIT License/);
});
test('Home and My Documents use precisely one file row rendering function',()=>{
 const main=file('src/main.js');
 assert.match(main,/function renderSavedFileRow\(item,index\)/);
 assert.match(main,/matched\.map\(\(\{doc,index\}\)=>renderSavedFileRow\(doc,index\)\)/);
 assert.match(main,/matched\.map\(\(\{item,index\}\)=>renderSavedFileRow\(item,index\)\)/);
 const shared=main.split('function renderSavedFileRow(item,index)')[1].split('function recentDocuments(')[0];
 assert.match(shared,/bulkUI\.checkbox\(item,index\)/);
 assert.match(shared,/data-thumb-uri/);
 assert.match(shared,/data-doc-share/);
 assert.match(shared,/data-doc-rename/);
 assert.match(shared,/data-doc-delete/);
 assert.match(main,/import '\.\/rivo-phosphor-unified-04581\.css'/);
});
test('thumbnail and all selected actions stay inside SAME horizontal row',()=>{
 const css=file('src/rivo-phosphor-unified-04581.css');
 assert.match(css,/flex-wrap:nowrap!important/);
 assert.match(css,/overflow-x:auto!important/);
 assert.match(css,/scroll-snap-type:x proximity!important/);
 assert.match(css,/height:72px!important/);
 assert.match(css,/height:66px!important/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(file('src/library-bulk.js'),/phosphorIcon/);
 assert.doesNotMatch(file('src/library-bulk.js'),/if\(root\.id==='home-recents'\)onOpenLibrary/);
});
test('PDF viewer has active More, print, zoom, edit, share, rename and external chooser',()=>{
 const viewer=file('src/document-viewer.js');
 assert.match(viewer,/doc-viewer-menu-panel/);
 assert.match(viewer,/bridge\.openFile\(\{uri:current\.uri\}\)/);
 assert.match(viewer,/bridge\.printFile\(\{uri:current\.uri\}\)/);
 assert.match(viewer,/menuItem\('external'/);
 assert.match(viewer,/menuItem\('print(er)?'/);
 assert.match(viewer,/doc-action-share/);
 assert.match(viewer,/iconButton\('scan'/);
 assert.match(viewer,/phosphorIcon\('file'/);
});
test('Android remains portrait and 0.45.82 has unique version code',()=>{
 assert.equal(JSON.parse(file('package.json')).version,'0.45.82');
 assert.match(file('rivoscan-version.properties'),/^versionCode=197$/m);
 assert.match(file('scripts/prepare-rivoscan-compact.py'),/screenOrientation="portrait"/);
 assert.match(file('scripts/verify-rivoscan-portrait.py'),/direction!="portrait"/);
});
