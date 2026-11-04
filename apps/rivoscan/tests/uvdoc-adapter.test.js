import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('UVDoc is an optional desktop ONNX experiment, not a fictitious Android model',()=>{
 const py=readFileSync(new URL('../scripts/uvdoc-offline.py',import.meta.url),'utf8');
 const notes=readFileSync(new URL('../PERFECTSCAN_IMPLEMENTATION.md',import.meta.url),'utf8');
 assert.ok(py.includes('TextImageUnwarping(model_name="UVDoc", engine="onnxruntime")'));
 assert.ok(py.includes('shutil.copy2(src, target)'));
 assert.ok(py.includes('sourceCopySha256'));
 assert.ok(py.includes('not part of Android APK'));
 assert.ok(notes.includes('not bundled or running in the Android APK'));
});
