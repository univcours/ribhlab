import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Process & save is disabled until valid document inputs exist',()=>{
 const s=get('src/main.js'),c=get('src/rivoscan-layout-repairs.css');
 assert.match(s,/function updateProcessAvailability\(\)/);
 assert.match(s,/button\.disabled=files\.length<minimum\|\|busy/);
 assert.ok(s.includes("const minimum=activeTool?.id==='merge'?2:1"));
 assert.ok(s.includes('updateProcessAvailability();\n  bulkUI.sync()'));
 assert.ok(s.includes('updateProcessAvailability();\n drawPreview()'));
 assert.match(c,/#app #process:disabled/);
});
test('Selected document filename and six actions are no longer compressed by legacy CSS',()=>{
 const c=get('src/rivoscan-layout-repairs.css');
 assert.match(c,/#app \.rivo-dark-ui \.rivo-scan-first \.rivo-premium-recent \.rivo-recent-card\.doc-selected/);
 assert.match(c,/#app \.rivo-dark-ui \.library-workspace #library-list \.document-entry\.doc-selected/);
 assert.match(c,/grid-column:1\/-1!important;grid-row:2!important/);
 assert.match(c,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
});
