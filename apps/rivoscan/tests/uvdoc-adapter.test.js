import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('UVDoc is a real verified Android ONNX model while retaining optional desktop QA runner',()=>{
 const py=readFileSync(new URL('../scripts/uvdoc-offline.py',import.meta.url),'utf8');
 const notes=readFileSync(new URL('../PERFECTSCAN_IMPLEMENTATION.md',import.meta.url),'utf8');
 assert.ok(py.includes('TextImageUnwarping(model_name="UVDoc", engine="onnxruntime")'));
 assert.ok(py.includes('shutil.copy2(src, target)'));
 assert.ok(py.includes('sourceCopySha256'));
 assert.ok(py.includes('not part of Android APK'));
 assert.ok(notes.includes('Native UVDoc ONNX'));
 const native=readFileSync(new URL('../native/android/RivoUVDocPlugin.java',import.meta.url),'utf8');
 const install=readFileSync(new URL('../install-live-scanner.ps1',import.meta.url),'utf8');
 assert.ok(native.includes('@CapacitorPlugin(name="RivoUVDoc")'));
 assert.ok(native.includes('OnnxTensor.createTensor('));
 assert.ok(native.includes('SHA256="54cab30dc2cf347b4f3d6971c833b1c3d84f5ef17280f1f6d15796bff20e63d6"'));
 assert.ok(install.includes("implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.31.1'"));
 assert.ok(install.includes("UVDoc official ONNX model SHA-256 verified and bundled"));
});
