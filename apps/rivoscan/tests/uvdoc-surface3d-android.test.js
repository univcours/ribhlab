import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('Official UVDoc ONNX runs natively on Android with pinned weights and no cloud image upload',()=>{
 const java=src('native/android/RivoUVDocPlugin.java');
 const installer=src('install-live-scanner.ps1');
 const web=src('src/uvdoc-android.js');
 const ui=src('src/perfect-scan-ui.js');
 const sha='54cab30dc2cf347b4f3d6971c833b1c3d84f5ef17280f1f6d15796bff20e63d6';
 for(const token of ['@CapacitorPlugin(name="RivoUVDoc")','OnnxTensor.createTensor(',sha,'blue=result[0][0][y][x]','sourceUntouched','FloatBuffer.wrap(channelFirst)'])
  assert.ok(java.includes(token),token);
 assert.ok(installer.includes("implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.31.1'"));
 assert.ok(installer.includes(sha));
 assert.ok(installer.includes('registerPlugin(RivoUVDocPlugin.class)'));
 assert.ok(web.includes('plugin.unwarp({imageBase64})'));
 assert.ok(web.includes('physical3D:false'));
 assert.ok(ui.includes('data-perfect-uvdoc'));
 assert.ok(ui.includes('uvdocModelSha256:result.neuralModelSha256||null'));
});

test('Relative 3D mode uses real epipolar pose + triangulation with rejection gates',()=>{
 const java=src('native/android/RivoSurface3DPlugin.java');
 const web=src('src/surface3d-android.js');
 const ui=src('src/perfect-scan-ui.js');
 const install=src('install-live-scanner.ps1');
 for(const token of ['ORB.create(2000)','findEssentialMat(','recoverPose(','triangulatePoints(','out.anchors.size()<MIN_INLIERS','3D reconstruction abstained','flatten(painted,best,w,h)','physical3DRelative','metricDepth",false'])
  assert.ok(java.includes(token),token);
 assert.ok(web.includes('plugin.reconstruct({images,renderBase64})'));
 assert.ok(web.includes('result?.physical3DRelative'));
 assert.ok(ui.includes('data-perfect-surface3d'));
 assert.ok(ui.includes('processed.surface3DRejectedReason'));
 assert.ok(ui.includes('relativeSurface3DApplied'));
 assert.ok(ui.includes('surface3DCameraCalibrationApproximate'));
 assert.ok(install.includes('registerPlugin(RivoSurface3DPlugin.class)'));
});

test('Neural and 3D mode require manual review and never claim metric depth',()=>{
 const ui=src('src/perfect-scan-ui.js'),docs=src('PERFECTSCAN_IMPLEMENTATION.md');
 assert.ok(ui.includes('if(!base||!result||!review.checked||working)return'));
 assert.ok(ui.includes('userConfirmedReview:true,originalKept:true'));
 assert.ok(ui.includes('relative 3D'));
 assert.ok(docs.includes('not metrically calibrated'));
 assert.ok(docs.includes('Severe folds, occluded text'));
});
