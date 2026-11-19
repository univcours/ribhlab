import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('One scanner entry and Plate Scanner replace user-facing PerfectScan',()=>{
 const main=get('src/main.js'),hub=get('src/tools-hub.js'),editor=get('src/scan-editor.js');
 assert.ok(main.includes('id="smart-scanner"'));
 assert.ok(!main.includes('launchPerfectScan('));
 assert.ok(!main.includes('id="scan-multi-angle"'));
 assert.ok(!main.includes('onPerfectScan:d=>launchPerfectScan(d)'));
 assert.ok(!hub.includes("type:'perfectScan'"));
 assert.ok(!hub.includes("'scanCode','perfectScanQuality'"));
 assert.ok(main.includes("{id:'plateScanner',icon:'scan'"));
 assert.ok(editor.includes("filter==='crease'"));
});
test('Advanced correction retains source in session and saves ONE user-confirmed PDF only',()=>{
 const ui=get('src/perfect-scan-ui.js');
 const block=ui.slice(ui.indexOf(' async function writeResult(){'),ui.indexOf(" root.addEventListener('click',e=>{"));
 assert.ok(ui.includes('captureReview'),'user crop review is still applied before PDF export');
 assert.ok(ui.includes('data-perfect="process"'));
 assert.ok(ui.includes('data-perfect="save"'));
 assert.ok(ui.includes('save.hidden=!result'));
 assert.ok(ui.includes('if(!base||!result||working)return'));
 assert.ok(!ui.includes('data-perfect-review'));
 assert.ok(!ui.includes('review.checked'));
 assert.equal((block.match(/await onSave\(/g)||[]).length,1,'each Save click publishes one document');
 assert.ok(block.includes("await onSave(pdfBytes,'RivoScan_PerfectScan_'+stamp+'.pdf','application/pdf')"));
 assert.ok(block.includes('page.drawImage(documentImage'),'finished edited pixels go into the PDF');
 assert.ok(!block.includes('RivoScan_Original_'),'never create duplicate original image');
 assert.ok(!block.includes('_integrity.json'),'never create JSON');
 assert.ok(!block.includes("await onSave(out,name"),'never create JPEG separately');
});
test('Real relative 3D and neural UVDoc retain source fidelity and do not claim metric 3D',()=>{
 const ui=get('src/perfect-scan-ui.js');
 assert.ok(ui.includes('processed.surface3DApplied=true'));
 assert.ok(ui.includes('processed.surface3DRejectedReason'));
 assert.ok(ui.includes('processed.integrity=inspectInkChanges'));
 assert.ok(ui.includes('result={...processed,sourceName:base.name'));
 assert.ok(ui.includes("const frames=extra.map(({data})=>({data}))"));
 assert.ok(ui.includes("method==='surface3d'"));
 assert.ok(ui.includes("method==='uvdoc'"));
});
