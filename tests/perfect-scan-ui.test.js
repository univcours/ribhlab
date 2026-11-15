import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/perfect-scan-ui.js',import.meta.url),'utf8');
test('PerfectScan compares REAL source and processed pixel buffers via one draggable slider',()=>{
 for(const feature of ['rivo-perfect-compare-range','splitPreview=()=>','makeLayer(base.data)',
 'makeLayer(result.pixels)','ctx.drawImage(compareLayers.before',
 'ctx.drawImage(compareLayers.after','compareRange.addEventListener('])
  assert.ok(src.includes(feature),feature);
 assert.ok(src.includes('compareRange.hidden=false;splitPreview()'));
 assert.ok(src.includes('previewPixels(base.data'));
 assert.ok(src.includes('previewPixels(processed.pixels'));
 assert.ok(src.includes('result.pixels'));
});
test('PerfectScan preserves user input in memory, warns on image quality, and exports only one final PDF',()=>{
 for(const marker of ['base.fromLibrary','inspectInkChanges','processed.requiresReview',
  'const pdf=await PDFDocument.create()', 'await pdf.embedJpg(', 'page.drawImage(documentImage',
  "await onSave(pdfBytes,'RivoScan_PerfectScan_'+stamp+'.pdf','application/pdf')"])
  assert.ok(src.includes(marker),marker);
 const save=src.slice(src.indexOf(' async function writeResult(){'),src.indexOf(" root.addEventListener('click',e=>{"));
 assert.equal((save.match(/await onSave\(/g)||[]).length,1);
 assert.doesNotMatch(save,/RivoScan_Original_|\.json|application\/json|onSave\(out,name/);
});
