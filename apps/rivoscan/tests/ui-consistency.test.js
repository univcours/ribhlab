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
