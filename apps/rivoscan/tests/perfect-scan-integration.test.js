import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const get=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('PerfectScan Pro is reachable from home and an existing photo with original kept',()=>{
 const main=get('src/main.js'),editor=get('src/scan-editor.js'),ui=get('src/perfect-scan-ui.js');
 for(const token of ["import { openPerfectScan }",'data-perfectscan-launch','onPerfectScan:d=>launchPerfectScan(d)','function launchPerfectScan(doc=null)','onSave:saveOut'])
  assert.ok(main.includes(token),token);
 for(const token of ['data-edit="perfectScan"',"action==='perfectScan'&&onPerfectScan"])
  assert.ok(editor.includes(token),token);
 assert.ok(ui.includes('onSave(base.bytes'), 'unaltered source uploaded to device Documents for new import');
 assert.ok(ui.includes('originalKept:true'));
 assert.ok(ui.includes('onSave(out,name'));
 assert.ok(ui.includes('userConfirmedReview:true'));
});
test('PerfectScan distinguishes real relative 3D from absent/certified metric depth and blocks save until review',()=>{
 const ui=get('src/perfect-scan-ui.js');
 assert.ok(ui.includes('relative 3D triangulation'));
 assert.ok(ui.includes('surface3DCameraCalibrationApproximate'));
 assert.ok(ui.includes('not certified forensic authenticity'));
 assert.ok(ui.includes('no 3D reconstruction'));
 assert.ok(ui.includes("if(!base||!result||!review.checked||working)return"));
 assert.ok(ui.includes("save.disabled=!result||!review.checked"));
 assert.ok(ui.includes("extraFramesSelected:result.extraCount"));
 assert.ok(ui.includes("noUploadByPerfectScan:true"));
});

test('ML Kit deep clean is optional and user-initiated, not a silent replacement',()=>{
 const main=get('src/main.js'),ui=get('src/perfect-scan-ui.js');
 assert.ok(main.includes("onDeepClean:Capacitor.isNativePlatform()"));
 assert.ok(ui.includes("if(action==='mlkit'&&onDeepClean)"));
 assert.ok(ui.includes('onDeepClean=null'));
});
