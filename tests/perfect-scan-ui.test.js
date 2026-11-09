import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';const s=readFileSync(new URL('../src/perfect-scan-ui.js',import.meta.url),'utf8');
test('Multi-angle mode hides its empty canvas, has no consent checkbox and no idle Save buttons',()=>{
 for(const token of ['perfectScanRGBA(', 'capture="environment"','type="file" accept="image/*" multiple',
   'data-perfect="process"','data-perfect="save"','data-perfect-mode','rivo-perfectscan-preview" hidden',
   'rivo-perfectscan-actions" hidden','save.hidden=!result','preview.hidden=false',
   'originalSha256','processedSha256','onSave(new TextEncoder().encode(JSON.stringify(audit','onRefresh()'])
  assert.ok(s.includes(token),token);
 assert.ok(!s.includes('data-perfect-review'));
 assert.ok(!s.includes('review.checked'));
 assert.ok(!s.includes('input type="checkbox"'));
 assert.ok(s.includes('SHA256Available'));
 assert.ok(s.includes('noUploadByPerfectScan:true'));
 assert.ok(s.includes('if(!base.fromLibrary)'));
});
test('Scanner exports fidelity JPEG + PDF + report with explicit Save action only',()=>{
 for(const token of ['PDFDocument.create()','pdf.embedJpg(out)','sheet.drawImage(image',
   'pdfSha256','processedPdfName:pdfName','captureQuality:result.quality',
   'assessDocumentQualityRGBA(', 'onSave(pdfBytes,pdfName'])
  assert.ok(s.includes(token),token);
 assert.ok(!s.includes("if(root.querySelector('[data-perfect-pdf]').checked)"));
 assert.ok(s.includes("if(!base||!result||working)return"));
});
