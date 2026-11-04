import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('PerfectScan modal exposes one-tap enhancement, camera multi-angle, local fusion and user review',()=>{
 const s=readFileSync(new URL('../src/perfect-scan-ui.js',import.meta.url),'utf8');
 for(const token of ['perfectScanRGBA(', 'capture="environment"','type="file" accept="image/*" multiple','data-perfect="process"','data-perfect="save"','data-perfect-review','data-perfect-geometry','onSave(new TextEncoder().encode(JSON.stringify(audit','originalSha256','processedSha256','onRefresh()'])
  assert.ok(s.includes(token),token);
 assert.ok(s.includes("review.checked"),'user explicit approval before save');
 assert.ok(s.includes('SHA256Available'));
 assert.ok(s.includes('noUploadByPerfectScan:true'));
 assert.ok(s.includes("if(!base.fromLibrary)"),'imported source also preserved');
});
