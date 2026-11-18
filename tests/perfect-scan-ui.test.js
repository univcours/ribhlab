import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/perfect-scan-ui.js',import.meta.url),'utf8');
test('PerfectScan compares REAL source and processed pixel buffers via one draggable slider',()=>{
 for(const feature of ['rivo-perfect-compare-range','splitPreview=()=>','makeLayer(base.data)',
 'makeLayer(result.pixels)','ctx.drawImage(compareLayers.before',
 'ctx.drawImage(compareLayers.after','compareRange.addEventListener('])
  assert.ok(src.includes(feature),feature);
 assert.ok(src.includes('setCompareMode(false);'), 'enhanced image is default after processing');
 assert.ok(src.includes("else if(action==='compare')setCompareMode(!compareActive)"), 'comparison is user opt-in');
 assert.ok(src.includes('compareRange.hidden=!compareActive;'), 'slider is hidden outside comparison');
 assert.ok(src.includes('if(compareActive)splitPreview()'), 'split view is used only in comparison mode');
 assert.ok(src.includes('preview.append(compare);'), 'compare control stays on image, not in scrolling tools');
 assert.ok(!src.includes('compareRange.hidden=false;splitPreview()'), 'no automatic split overlay');
 assert.ok(src.includes('previewPixels(base.data'));
 assert.ok(src.includes('previewPixels(processed.pixels'));
 assert.ok(src.includes('result.pixels'));
});
test('PerfectScan preserves user input in memory, warns on image quality, and exports only one final PDF',()=>{
 for(const marker of ['name,mime,fromLibrary,captureReview','inspectInkChanges','processed.requiresReview',
  'const pdf=await PDFDocument.create()', 'await pdf.embedJpg(', 'page.drawImage(documentImage',
  "await onSave(pdfBytes,'RivoScan_PerfectScan_'+stamp+'.pdf','application/pdf')"])
  assert.ok(src.includes(marker),marker);
 const save=src.slice(src.indexOf(' async function writeResult(){'),src.indexOf(" root.addEventListener('click',e=>{"));
 assert.equal((save.match(/await onSave\(/g)||[]).length,1);
 assert.doesNotMatch(save,/RivoScan_Original_|\.json|application\/json|onSave\(out,name/);
});

test('PerfectScan defaults to nonwarping readable enhancement; curvature is opt-in',()=>{
 assert.ok(src.includes('value="enhance"'),'safe enhancement is the selected default');
 assert.ok(src.includes("geometry:method==='geometry'"),'2D page warp only on explicit selection');
 assert.ok(src.includes('diagnostics.hidden=false;'),'technical details available on demand');
 assert.ok(src.includes('methodApplied'),'selected method must be reported separately from applied correction');
 assert.ok(src.includes('setStatus(summary,processed.requiresReview'),'quality summary stays concise');
});
test('RivoScan blue high-contrast controls are loaded after legacy styles',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/rivo-controls-clarity.css',import.meta.url),'utf8');
 assert.ok(main.indexOf("import './rivo-controls-clarity.css';")>main.indexOf("import './rivo-blue-editor-layout.css';"));
 for(const feature of [
  '.rivo-perfect-preview-compare[hidden]',
  'rivo-perfectscan-modal>.rivo-edit-bottom-bar',
  '.rivo-perfectscan-status.rivo-warning',
  '.rivo-workspace-task.active',
  'button:disabled:not([hidden])'
 ])assert.ok(css.includes(feature),feature);
});
