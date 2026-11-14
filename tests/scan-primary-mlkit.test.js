import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('All primary Android Scan buttons launch Google ML Kit FULL with built-in crop review',()=>{
 const main=get('src/main.js');
 assert.ok(main.includes("import { DocumentScanner } from '@capacitor-mlkit/document-scanner'"));
 assert.ok(main.includes('data-primary-scanner="mlkit-full"'));
 assert.ok(main.includes('DocumentScanner.scanDocument(mlkitFullOptions(mode,pageLimit))'));
 assert.ok(main.includes("document.getElementById('smart-scanner')?.addEventListener('click',()=>openSmartScanner())"));
 assert.ok(main.includes("if(Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android') await openSmartScanner()"));
 assert.ok(main.includes("if(spec.type==='scan'){await openSmartScanner();return}"));
 assert.ok(main.includes("if(spec.type==='idcard'){await openSmartScanner({mode:'ID Card',pageLimit:2});return}"));
 assert.ok(main.includes("onRetake:()=>openSmartScanner()"));
});
test('Google cancellation never saves; no automatic CameraX fallback',()=>{
 const main=get('src/main.js');
 const block=main.slice(main.indexOf('async function openSmartScanner('),main.indexOf('async function openCamera(){'));
 assert.ok(block.includes('if(/cancel|user dismissed|aborted/i.test(message))return'));
 assert.ok(!block.includes('await openLiveScanner('));
 assert.ok(!block.includes('RivoLiveScanner.scan('));
 assert.ok(main.includes('await persistMlKitPdf(result,'));
 assert.ok(main.includes("if(mlkitFull&&result?.scanMode!=='ID Card')"));
 assert.ok(main.includes('await idCardToPdf(picked)'));
});
test('PerfectScan Pro remains in saved-document tools, not as camera fallback',()=>{
 const main=get('src/main.js'),ui=get('src/perfect-scan-ui.js');
 assert.ok(main.includes('onPerfectScan:d=>launchPerfectScan(d)'));
 assert.ok(main.includes("onUVDoc:!COMPACT_BUILD&&Capacitor.isNativePlatform()"));
 assert.ok(main.includes("onSurface3D:!COMPACT_BUILD&&Capacitor.isNativePlatform()"));
 assert.ok(main.includes("id=\"scan-multi-angle\""),'advanced correction remains accessible');
 assert.ok(main.includes('Advanced paper correction'),'label must describe the result, not implementation details');
 assert.ok(ui.includes("title:'PerfectScan Pro'"));
 assert.ok(!ui.includes('data-perfect-review'));
});
