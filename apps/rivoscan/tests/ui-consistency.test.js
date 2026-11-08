import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Latest UI correction sheet overrides old window and card rules',()=>{
 const main=read('src/main.js'),css=read('src/ui-consistency.css');
 assert.ok(main.indexOf("import './ui-consistency.css'")>main.indexOf("import './turquoise-v2.css'"));
 for(const token of ['.rivo-code-dialog .rivo-code-actions','grid-template-columns:repeat(2,minmax(0,1fr))','.rivo-selection-inline','grid-template-columns:repeat(6,minmax(0,1fr))'])assert.ok(css.includes(token),token);
 assert.ok(css.includes('#app input[type="file"]'));
});
test('Quick scan labels explicitly describe the action rather than a document noun',()=>{
 const txt=read('src/scanner-first-model.js');
 assert.ok(txt.includes('Scan document'));
 assert.ok(txt.includes('تصوير وثيقة'));
 assert.ok(txt.includes('Importer des photos'));
});
test('Android Back and Escape dismiss tool windows first and protect busy saves',()=>{
 const main=read('src/main.js');
 for(const label of ['.rivo-code-overlay','.rivo-id-overlay','.rivo-pages-overlay','.bulk-overlay','.doc-detail-overlay'])assert.ok(main.includes(label));
 assert.ok(main.includes("data-rivo-dialog-close"));
 assert.ok(main.includes("event.stopImmediatePropagation();navigateRivoBack()"));
 assert.ok(main.includes("if(bulkUI.mode())"));
 assert.ok(main.includes("nativeCaptureDepth>0"));
});
test('All shared dialog families expose an explicit accessible close action',()=>{
 for(const f of ['book-split','formula-ocr','barcode-scanner','photo-translation','count-cam','pdf-lock','id-photo-maker','document-ai','page-manager','whats-new'])
  assert.match(read('src/'+f+'.js'),/rivoDialogClose|data-rivo-dialog-close/,f);
});
test('Formula preview remains hidden until an image is selected',()=>{
 const txt=read('src/formula-ocr.js');
 assert.ok(txt.includes('preview.hidden=true'));
 assert.ok(txt.includes('preview.hidden=false'));
});

test('CameraX-owned Android dialogs inherit turquoise rounded window and accessible options title',()=>{
 const setup=read('install-live-scanner.ps1'),native=read('native/android/RivoLiveScannerActivity.java');
 assert.ok(setup.includes('name="RivoTurquoiseDialog"'));
 assert.ok(setup.includes('rivoscan_dialog_bg.xml'));
 assert.ok(setup.includes('#03B8AA'));
 assert.ok(native.includes('R.style.RivoTurquoiseDialog'));
 assert.ok(native.includes('"Camera options"'));
 assert.ok(!native.includes('new android.app.AlertDialog.Builder(this)'));
});

test('Screenshot audit awaits async Tools navigation before collecting all 48 buttons',()=>{
 const src=read('scripts/capture-webview-interactions.mjs');
 assert.ok(src.includes('await sleep(1100); // Navigation is async'));
 assert.ok(src.includes('TOOLS_DISCOVERED'));
 assert.ok(src.includes('48 Tools directory discovered after navigation'));
 assert.ok(src.includes("await auditVisibleButtons(cd,'tools')"));
});

test('Document actions are three compact labelled buttons and selection hint matches checkbox behaviour',()=>{
 const main=read('src/main.js'),bulk=read('src/library-bulk.js'),css=read('src/ui-consistency.css');
 assert.ok(main.includes('Choose folder'));
 assert.ok(main.includes('Open folder'));
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(bulk.includes('Tick the checkbox to see document actions.'));
 assert.ok(!bulk.includes('Long-press any document for more actions.'));
});

test('Android screenshot automation safely selects tool buttons without nested quote syntax errors',()=>{
 const code=read('scripts/capture-webview-interactions.mjs');
 assert.ok(code.includes('find(el=>el.dataset.hubAction==='));
 assert.ok(!code.includes('document.querySelector("[data-hub-action=\'+JSON.stringify(entry.id)'));
});

test('File chooser labels replace bare white WebView pickers in Lock PDF and ID Photo',()=>{
 for(const file of ['pdf-lock','id-photo-maker']){
  const code=read('src/'+file+'.js');
  assert.ok(code.includes("input.hidden=true"),file);
  assert.ok(code.includes("rivo-file-picker-button"),file);
  assert.ok(code.includes("rivo-picker-filename"),file);
 }
});
test('Book Scan Back cannot interrupt a PDF save',()=>{
 const code=read('src/book-split.js');
 assert.ok(code.includes("const cleanup=()=>{if(busy)return;"));
 assert.ok(code.includes("if(!closed){busy=false;cleanup();}"));
});
