import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Google ML Kit FULL is the only primary Scan entry across Home, Scan workspace and Tools',()=>{
 const main=get('src/main.js');
 assert.ok(main.includes("import { DocumentScanner } from '@capacitor-mlkit/document-scanner';"));
 assert.ok(main.includes('data-primary-scanner="mlkit-full"'));
 assert.ok(main.includes("scannerMode:'FULL'"));
 assert.ok(main.includes("galleryImportAllowed:true,pageLimit:count,resultFormats:'JPEG'"));
 assert.ok(main.includes("document.getElementById('smart-scanner')?.addEventListener('click',()=>openSmartScanner())"));
 assert.ok(main.includes("if(Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android') await openSmartScanner();"));
 assert.ok(main.includes("if(spec.type==='scan'){await openSmartScanner();return}"));
 assert.ok(main.includes("if(spec.type==='idcard'){await openSmartScanner({mode:'ID Card',pageLimit:2});return}"));
 assert.ok(main.includes("onRetake:()=>openSmartScanner()"));
 assert.ok(main.includes("await consumeSmartScan(mode==='ID Card'?{...result,scanMode:'ID Card'}:result,{mlkitFull:true})"));
});

test('CameraX fallback never replaces Google ML Kit FULL after cancellation, and cannot recurse',()=>{
 const main=get('src/main.js');
 assert.ok(main.includes("if(/cancel|user dismissed|aborted/i.test(message))return"));
 assert.ok(main.includes("if(incompatible&&allowNativeFallback&&Capacitor.isPluginAvailable('RivoLiveScanner'))"));
 assert.ok(main.includes("await openSmartScanner({mode,allowNativeFallback:false})"));
 assert.ok(main.includes("await openLiveScanner({mode})"));
 assert.ok(main.includes("await saveOut(new Uint8Array(await page.arrayBuffer()),page.name,'image/jpeg')"));
 assert.ok(!main.includes("document.getElementById('smart-scanner')?.addEventListener('click',()=>openLiveScanner())"));
 assert.ok(!main.includes('id="camera"'),'no separate basic camera button next to main scanner');
});

test('PerfectScan not user-facing; advanced correction integrated with scanner settings',()=>{
 const main=get('src/main.js');
 const ui=get('src/perfect-scan-ui.js');
 assert.ok(main.includes('data-scan-advanced'));
 assert.ok(main.includes("document.querySelectorAll('[data-scan-advanced]')"));
 assert.ok(main.includes('id="scan-multi-angle"'));
 assert.ok(!main.includes('PerfectScan Pro'));
 assert.ok(!main.includes('data-perfectscan-launch'));
 assert.ok(!ui.includes("title:'PerfectScan Pro'"));
 assert.ok(!ui.includes('data-perfect="mlkit"'));
 assert.ok(!ui.includes('data-perfect-review'));
 assert.ok(ui.includes('data-perfect-mode'));
 assert.ok(ui.includes('originalKept:true'));
});
