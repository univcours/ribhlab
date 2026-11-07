import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Native CameraX is primary for full user-controlled photo confirmation',()=>{
 const m=get('src/main.js'),java=get('native/android/RivoLiveScannerActivity.java');
 assert.ok(m.includes("if(Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android') await openLiveScanner();"));
 assert.ok(m.includes("onRetake:()=>openLiveScanner()"));
 assert.ok(java.includes('showCaptureReview(bmp)'));
 assert.ok(java.includes('button("✓  "+localizedCapture("confirm")'));
 assert.ok(java.includes('if(openCvReady&&editor!=null)prepareEnhancementPreview()'));
 assert.ok(java.includes('localizedCapture("done")'));
});
test('ML Kit FULL is separately available and never recurses on cancelled capture',()=>{
 const m=get('src/main.js');
 for(const token of ["import { DocumentScanner } from '@capacitor-mlkit/document-scanner';",
 'data-primary-scanner="mlkit-full"',"scannerMode:'FULL'",
 "document.getElementById('smart-scanner')?.addEventListener('click',()=>openSmartScanner())",
 "if(spec.type==='scan'){await openSmartScanner();return}",
 "if(/cancel|user dismissed|aborted/i.test(message))return",
 "await openSmartScanner({mode,allowNativeFallback:false})"])
 assert.ok(m.includes(token),token);
 assert.ok(!m.includes("await saveOut(new Uint8Array(await page.arrayBuffer()),page.name,'image/jpeg')"));
 assert.ok(m.includes("await saveOut(pdf,"));
});
test('Advanced scan controls have real behaviors, not placeholder UI',()=>{
 const m=get('src/main.js'),ui=get('src/perfect-scan-ui.js');
 assert.ok(m.includes('data-scan-advanced'));
 assert.ok(m.includes("document.querySelectorAll('[data-scan-advanced]')"));
 assert.ok(m.includes('id="scan-multi-angle"'));
 assert.ok(!m.includes('PerfectScan Pro'));
 assert.ok(!m.includes('data-perfectscan-launch'));
 assert.ok(!ui.includes("title:'PerfectScan Pro'"));
 assert.ok(!ui.includes('data-perfect="mlkit"'));
 assert.ok(ui.includes('data-perfect-mode'));
});
