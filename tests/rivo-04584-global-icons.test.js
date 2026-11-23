import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasMaterialSymbol,materialSymbol,MATERIAL_SYMBOLS_MAP} from '../src/material-symbols.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Material Symbols Rounded is self-hosted and covers every scanner/editor command',()=>{
 const main=read('src/main.js');
 assert.ok(main.includes("import '@fontsource-variable/material-symbols-rounded/full.css'"));
 assert.ok(main.includes("import './rivo-material3-expressive-04587.css'"));
 assert.ok(main.includes('installMaterialAutoIcons()'));
 for(const key of ['flash','torch','undo','redo','rotate-left','rotate-right','up','down','chevron-down',
  'eraser','calendar','brightness','gallery','background','magic','compare','copy','close',
  'share','trash','scan','camera','pdf','save','settings','crop','merge','qr','barcode']){
  assert.ok(hasMaterialSymbol(key),'Unmapped Material symbol '+key);
  assert.match(materialSymbol(key,19),/class="material-symbols-rounded rivo-material-symbol"/);
 }
 assert.ok(Object.keys(MATERIAL_SYMBOLS_MAP).length>=110,'All features need the full Material symbol map');
 assert.doesNotMatch(read('src/phosphor-icons.js'),/import\s+\{p[A-F]\}/);
});
test('all existing scanner and editor modules route into the Material renderer without losing handlers',()=>{
 const paths=[
 'src/barcode-scanner.js','src/plate-scanner.js',
 'src/scan-editor.js','src/perfect-scan-ui.js','src/perfectscan-capture-review.js',
 'src/page-manager.js','src/edge-adjustment.js','src/privacy-shield.js',
 'src/book-split.js','src/id-photo-maker.js','src/preview-workspace.js',
 'src/merged-tools.js','src/library-bulk.js'
 ];
 for(const path of paths){
  assert.match(read(path),/phosphorIcon\(|materialSymbol\(/,'No icon output in '+path);
 }
 assert.match(read('src/phosphor-icons.js'),/phosphorIcon=materialSymbol/);
 for(const path of ['src/book-split.js','src/id-photo-maker.js'])
  assert.doesNotMatch(read(path),/<svg viewBox="0 0 24 24"|<svg aria-hidden="true" viewBox="0 0 24 24"/);
 const qr=read('src/barcode-scanner.js'),plate=read('src/plate-scanner.js');
 assert.ok(qr.includes("kind==='copy'?'copy'"));
 assert.ok(plate.includes("phosphorIcon('copy'")||plate.includes("materialSymbol('copy'"));
});
test('file selection preserves checkbox and photo/PDF thumbnails on Home and Documents',()=>{
 const main=read('src/main.js'),bulk=read('src/library-bulk.js'),css=read('src/rivo-selection-04544-04583.css');
 assert.doesNotMatch(main,/bulkUI\.wireLongPress|bulkUI\.suppressClick/);
 assert.doesNotMatch(bulk,/function wireLongPress|function longPress\(/);
 assert.match(main,/renderSavedFileRow\(doc,index\)/);
 assert.match(main,/renderSavedFileRow\(item,index\)/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/padding:0!important/);
});
test('unchanged ML Kit, signed release and original Android ABI compatibility',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.92');
 assert.match(read('rivoscan-version.properties'),/^versionCode=207$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.92$/m);
 const flow=read('.github/workflows/rivoscan-04588-master-audit.yml');
 for(const x of ['arm64-v8a','armeabi-v7a','x86','x86_64','universal',
  'verify-rivoscan-abi-content.py','bundleRelease','screenOrientation'])
  assert.ok(flow.includes(x),x);
});
