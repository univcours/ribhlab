import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasPhosphorIcon,phosphorIcon} from '../src/phosphor-icons.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('RivoScan 0.45.84 bundles the official offline Phosphor Duotone set and aliases',()=>{
 const main=read('src/main.js'),icons=read('src/phosphor-icons.js'),extra=read('src/phosphor-icons-extra.js');
 assert.match(main,/import '\.\/rivo-phosphor-global-04584\.css'/);
 assert.match(main,/installPhosphorAutoIcons\(\)/);
 assert.match(icons,/\.\.\.pExtra/);
 assert.match(extra,/Official Phosphor Duotone/);
 for(const key of ['flash','torch','undo','redo','rotate-left','rotate-right','up','down','chevron-down',
   'eraser','calendar','brightness','gallery','background','magic','compare','copy','close',
   'share','trash','scan','camera','pdf','save','settings','crop','merge','qr','barcode']){
  assert.ok(hasPhosphorIcon(key),'Unavailable official icon '+key);
  assert.match(phosphorIcon(key,19),/<svg data-phosphor-icon=/);
 }
});
test('Every scanner and editor window uses Phosphor icons, no hand-coded SVG controls',()=>{
 const paths=[
  'src/document-viewer.js','src/barcode-scanner.js','src/plate-scanner.js',
  'src/scan-editor.js','src/perfect-scan-ui.js','src/perfectscan-capture-review.js',
  'src/page-manager.js','src/edge-adjustment.js','src/privacy-shield.js',
  'src/book-split.js','src/id-photo-maker.js','src/preview-workspace.js','src/merged-tools.js'
 ];
 for(const path of paths)assert.match(read(path),/phosphorIcon\(/,'Phosphor missing from '+path);
 for(const path of ['src/book-split.js','src/id-photo-maker.js']){
  assert.doesNotMatch(read(path),/<svg viewBox="0 0 24 24"|<svg aria-hidden="true" viewBox="0 0 24 24"/);
 }
 for(const path of ['src/scan-editor.js','src/perfectscan-capture-review.js','src/edge-adjustment.js','src/privacy-shield.js']){
  assert.doesNotMatch(read(path),/>✕<|>✎\s|>↶\s/,'Legacy glyph in '+path);
 }
 const scan=read('src/plate-scanner.js'),qr=read('src/barcode-scanner.js');
 assert.doesNotMatch(scan,/btn\('✕'|btn\('⚡'|guide\.textContent='▢'/);
 assert.doesNotMatch(qr,/iconButton\('✕'|iconButton\('⚡/);
 assert.match(qr,/phosphorIcon\('copy'/);
 assert.match(scan,/phosphorIcon\('copy'/);
});
test('Checkbox-only file selection and full thumbnail remain in both screens',()=>{
 const main=read('src/main.js'),bulk=read('src/library-bulk.js');
 assert.doesNotMatch(main,/bulkUI\.wireLongPress|bulkUI\.suppressClick/);
 assert.doesNotMatch(bulk,/function wireLongPress|function longPress\(/);
 assert.match(main,/renderSavedFileRow\(doc,index\)/);
 assert.match(main,/renderSavedFileRow\(item,index\)/);
 const css=read('src/rivo-selection-04544-04583.css');
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/padding:0!important/);
 assert.match(css,/:is\(#home-recents,#library-list\)/);
});
test('Native device support, unchanged ML Kit features and signed release metadata',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.84');
 assert.match(read('rivoscan-version.properties'),/^versionCode=199$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.84$/m);
 const flow=read('.github/workflows/rivoscan-04584-phosphor-all-icons.yml');
 for(const x of ['arm64-v8a','armeabi-v7a','x86','x86_64','universal',
  'verify-rivoscan-abi-content.py','bundleRelease','screenOrientation'])assert.ok(flow.includes(x),x);
});
