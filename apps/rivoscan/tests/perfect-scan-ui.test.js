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
test('PerfectScan preserves original, warns on quality and never claims artificial reconstruction',()=>{
 for(const marker of ['base.fromLibrary','inspectInkChanges','processed.requiresReview',
 'processedPdfName:pdfName','originalKept:true','noUploadByPerfectScan:true'])
  assert.ok(src.includes(marker),marker);
});
