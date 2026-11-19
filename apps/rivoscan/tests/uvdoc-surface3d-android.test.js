import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('Official UVDoc ONNX stays usable in native CameraX with pinned offline weights',()=>{
 const java=src('native/android/RivoUVDocPlugin.java');
 const native=src('native/android/RivoLiveScannerActivity.java');
 const install=src('install-live-scanner.ps1');
 const sha='54cab30dc2cf347b4f3d6971c833b1c3d84f5ef17280f1f6d15796bff20e63d6';
 for(const token of ['@CapacitorPlugin(name="RivoUVDoc")','OnnxTensor.createTensor(',sha,'sourceUntouched','FloatBuffer.wrap(channelFirst)'])
  assert.ok(java.includes(token),token);
 assert.ok(install.includes("implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.31.1'"));
 assert.ok(install.includes('registerPlugin(RivoUVDocPlugin.class)'));
 assert.ok(native.includes('AI_FLATTEN="uvdoc"'));
 assert.ok(native.includes('RivoUVDocPlugin.unwarpBitmap(this,image)'));
 assert.ok(java.includes('static Bitmap unwarpBitmap('));
});

test('Old multi-angle 3D feature is disconnected from every user-facing RivoScan flow',()=>{
 const main=src('src/main.js'),hub=src('src/tools-hub.js'),editor=src('src/scan-editor.js');
 for(const token of ['RivoSurface3D','surface3d-android','openPerfectScan','perfect-scan-ui','scan-multi-angle','perfectScanQuality'])
  assert.ok(!main.includes(token),token);
 assert.ok(!hub.includes('perfectScanQuality'));
 assert.ok(!editor.includes('onPerfectScan'));
});
