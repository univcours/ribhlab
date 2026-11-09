import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Keep modern stable CameraX and newest tested OpenCV 4.x integration',()=>{
 const s=readFileSync(new URL('../install-live-scanner.ps1',import.meta.url),'utf8');
 assert.ok(s.includes("implementation 'org.opencv:opencv:4.14.0'"));
 for(const name of ['camera-core','camera-camera2','camera-lifecycle','camera-view'])
  assert.ok(s.includes("androidx.camera:"+name+":1.6.2"));
});
