import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('Exactly one user-facing scan entry with Advanced multi-angle inside Scan workspace',()=>{
 const main=get('src/main.js'),hub=get('src/tools-hub.js'),editor=get('src/scan-editor.js');
 assert.ok(main.includes('id="smart-scanner"'),'native CameraX capture entry exists');
 assert.ok(main.includes('id="scan-multi-angle"'),'PerfectScan Pro directly accessible inside scanner');
 assert.ok(main.includes('PerfectScan Pro · UVDoc AI / 3D'));
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
test('Advanced correction keeps sources and only enables user Save after image processing',()=>{
 const ui=get('src/perfect-scan-ui.js');
 assert.ok(ui.includes('onSave(base.bytes'),'original photo preserved');
 assert.ok(ui.includes('originalKept:true'));
 assert.ok(ui.includes('onSave(out,name'));
 assert.ok(ui.includes('userSavedResult:true'));
 assert.ok(ui.includes('data-perfect="process"'));
 assert.ok(ui.includes('data-perfect="save"'));
 assert.ok(ui.includes('save.hidden=!result'));
 assert.ok(ui.includes('if(!base||!result||working)return'));
 assert.ok(!ui.includes('data-perfect-review'));
 assert.ok(!ui.includes('review.checked'));
});
test('Real relative 3D and neural UVDoc retain source fidelity and do not claim metric 3D',()=>{
 const ui=get('src/perfect-scan-ui.js');
 assert.ok(ui.includes('relative 3D triangulation'));
 assert.ok(ui.includes('surface3DCameraCalibrationApproximate'));
 assert.ok(ui.includes('not certified forensic authenticity'));
 assert.ok(ui.includes('no 3D reconstruction'));
 assert.ok(ui.includes('extraFramesSelected:result.extraCount'));
 assert.ok(ui.includes('noUploadByPerfectScan:true'));
 assert.ok(ui.includes("method==='surface3d'"));
 assert.ok(ui.includes("method==='uvdoc'"));
});
