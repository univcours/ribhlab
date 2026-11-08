import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('Google ML Kit FULL is explicitly available next to the manually adjustable CameraX scanner',()=>{
 assert.ok(s.includes('id="google-auto-scan"'));
 assert.ok(s.includes("document.getElementById('google-auto-scan')?.addEventListener('click',()=>openSmartScanner({mode:'Document',allowNativeFallback:true}))"));
 assert.ok(s.includes("document.getElementById('smart-scanner')?.addEventListener('click',()=>openLiveScanner())"));
 assert.ok(s.includes("scannerMode:'FULL'"));
 assert.ok(s.includes("resultFormats:'JPEG'"));
});
