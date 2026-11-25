import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {materialSymbol} from '../src/material-symbols.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const version=readFileSync(new URL('../rivoscan-version.properties',import.meta.url),'utf8');

test('One primary Smart Scan camera is the Material Symbols Rounded photo_camera, without the duplicate FAB',()=>{
 assert.match(source,/rivo-nav-scan-ring[^\n]*ico\('camera',29\)/);
 assert.match(materialSymbol('camera',29),/data-material-symbol="photo_camera"/);
 assert.doesNotMatch(source,/class="floating-scan rivo-camera-fab"/);
 assert.match(source,/if\(Capacitor\.isNativePlatform\(\) && Capacitor\.getPlatform\(\)==='android'\) await openSmartScanner\(\)/);
});

test('Google ML Kit FULL remains first choice; fallback opens system native camera only for technical errors',()=>{
 const scan=source.slice(source.indexOf('async function openSmartScanner('),source.indexOf("CapacitorApp.addListener('appRestoredResult'"));
 assert.match(scan,/await DocumentScanner\.scanDocument\(mlkitFullOptions\(mode,pageLimit\)\)/);
 const catchIndex=scan.indexOf("}catch(err){");
 assert.ok(catchIndex>0);
 const afterCatch=scan.slice(catchIndex);
 assert.match(afterCatch,/if\(\/cancel\|user dismissed\|aborted\/i\.test\(message\)\)return/);
 assert.match(afterCatch,/await Camera\.getPhoto\(\{/);
 assert.match(afterCatch,/source:CameraSource\.Prompt/);
 assert.match(afterCatch,/resultType:CameraResultType\.DataUrl/);
 assert.match(afterCatch,/await imagesToPdf\('color',\[original\]\)/);
 assert.match(afterCatch,/await saveOut\(pdf,'RivoScan_Scan_'/);
 assert.match(afterCatch,/openLibrary\(\)/);
 assert.match(afterCatch,/Native camera fallback:/);
});

test('Fallback version is a new build, not a replacement of the signed 0.45.91 APK',()=>{
 assert.equal(pkg.version,'0.45.96');
 assert.match(version,/^versionCode=211$/m);
 assert.match(version,/^versionName=0\.45\.96$/m);
});
