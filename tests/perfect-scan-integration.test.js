import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('Exactly one user-facing scan entry with Advanced multi-angle inside Scan workspace',()=>{
 const main=get('src/main.js'),hub=get('src/tools-hub.js'),editor=get('src/scan-editor.js');
 assert.ok(main.includes('id="smart-scanner"'),'native CameraX capture entry exists');
 assert.ok(main.includes('id="scan-multi-angle"'),'PerfectScan Pro directly accessible inside scanner');
 assert.ok(main.includes("id=\"scan-multi-angle\""),'advanced correction remains accessible');
 assert.ok(main.includes('Advanced paper correction'),'label must describe the result, not implementation details');
 assert.ok(get('src/compact-turquoise.css').includes('.scan-quick-toolbar .rivo-perfectscan-restore'));

 assert.ok(get('src/perfect-scan-ui.js').includes('PerfectScan Pro'));

 assert.ok(main.includes("document.getElementById('scan-multi-angle')?.addEventListener"));
 assert.ok(main.includes("function launchPerfectScan(doc=null)"));
 assert.ok(main.includes('data-live-camera'),'home launches ONE native scan');
 assert.ok(!main.includes('data-perfectscan-launch'),'no separate PerfectScan product card');
 assert.ok(!main.includes('id="mlkit-scanner"'),'no second AI scanner entry');
 assert.ok(!hub.includes("entries:['idcard','idPhotoMaker','scanCode','photoTranslation','formulaOcr','ocr','smartScanPro'"));
 assert.ok(main.includes('onPerfectScan:d=>launchPerfectScan(d)'),'saved-document editor restores advanced PerfectScan Pro');
 assert.ok(!main.includes('onDeepClean:()=>openSmartScanner()'),'editor does not create a second scanner');
 assert.ok(editor.includes('filter===\'crease\''),'native and editor retain wrinkle filter');
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
