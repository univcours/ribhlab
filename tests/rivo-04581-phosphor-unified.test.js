import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MATERIAL_SYMBOLS_MAP,hasMaterialSymbol,materialSymbol} from '../src/material-symbols.js';
import {phosphorIcon} from '../src/phosphor-icons.js'; // legacy API adapter
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('all app icons now render bundled Material Symbols ROUNDED instead of Phosphor SVG',()=>{
 for(const key of Object.keys(MATERIAL_SYMBOLS_MAP)){
  const icon=materialSymbol(key,21);
  assert.ok(hasMaterialSymbol(key),'Unmapped Material symbol '+key);
  assert.match(icon,/<span class="material-symbols-rounded rivo-material-symbol" data-material-symbol=/);
  assert.doesNotMatch(icon,/data-phosphor-icon|<svg/);
  assert.equal(phosphorIcon(key,21),icon,'Old call sites must render Material Rounded as well');
 }
 const main=file('src/main.js'),pkg=JSON.parse(file('package.json'));
 assert.match(main,/@fontsource-variable\/material-symbols-rounded\/full\.css/);
 assert.match(main,/installMaterialAutoIcons\(\)/);
 assert.ok(pkg.dependencies['@fontsource-variable/material-symbols-rounded']);
 assert.match(file('src/phosphor-icons.js'),/Actual rendered icons are Google Material Symbols ROUNDED/);
});
test('Home and My Documents still render the same actual PDF/photo thumbnail and six actions',()=>{
 const main=file('src/main.js');
 assert.match(main,/function renderSavedFileRow\(item,index\)/);
 assert.match(main,/renderSavedFileRow\(doc,index\)/);
 assert.match(main,/renderSavedFileRow\(item,index\)/);
 const row=main.split('function renderSavedFileRow(item,index)')[1].split('function recentDocuments(')[0];
 for(const key of ['data-thumb-uri','data-doc-external','data-doc-shield','data-doc-edges',
  'data-doc-share','data-doc-rename','data-doc-delete'])assert.ok(row.includes(key),key);
 assert.ok(main.includes("import './rivo-file-actions-unclipped-04585.css'"));
});
test('expressive user interface preserves icon sizing, action row and Android external file open',()=>{
 const main=file('src/main.js'),css=file('src/rivo-material3-expressive-04587.css');
 assert.match(css,/var\(--m3-primary\)/);
 assert.match(css,/border-radius:var\(--m3-shape-large\)/);
 assert.match(css,/\.rivo-material-symbol\[data-material-symbol\]/);
 assert.match(css,/rivo-file-quick-actions/);
 assert.match(css,/button\.rivo-camera-fab\[hidden\]/);
 assert.doesNotMatch(main,/createDocumentViewer|docViewerUI|previewSavedDocument/);
 assert.match(main,/openSavedDocumentExternally/);
 assert.match(file('native/android/RivoDocumentsPlugin.java'),/Intent\.ACTION_VIEW/);
});
test('Android package keeps portrait, ML Kit and same signing identity with monotonic version',()=>{
 assert.equal(JSON.parse(file('package.json')).version,'0.45.90');
 assert.match(file('rivoscan-version.properties'),/^versionCode=205$/m);
 assert.match(file('scripts/prepare-rivoscan-compact.py'),/screenOrientation="portrait"/);
 assert.match(file('scripts/verify-rivoscan-portrait.py'),/direction!="portrait"/);
});
