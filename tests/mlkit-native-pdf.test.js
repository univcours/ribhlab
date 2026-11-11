import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mlkitFullOptions,persistMlKitPdf} from '../src/mlkit-scan-flow.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Google FULL crop/clean workflow returns one native PDF without published JPGs',()=>{
 assert.deepEqual(mlkitFullOptions(),{
  galleryImportAllowed:true,pageLimit:20,resultFormats:'PDF',scannerMode:'FULL'
 });
 assert.deepEqual(mlkitFullOptions('ID Card',2),{
  galleryImportAllowed:true,pageLimit:2,resultFormats:'JPEG_PDF',scannerMode:'FULL'
 });
 assert.equal(mlkitFullOptions('Document',500).pageLimit,50);
 const main=read('src/main.js');
 assert.ok(main.includes('DocumentScanner.scanDocument(mlkitFullOptions(mode,pageLimit))'));
 assert.ok(!main.includes("if(allowNativeFallback&&Capacitor.isPluginAvailable('RivoLiveScanner'))return openLiveScanner"));
 assert.ok(main.includes("if(mlkitFull&&result?.scanMode!=='ID Card')"));
 assert.ok(main.includes("localStorage.setItem(MLKIT_MODE_KEY,mode)"));
});

test('PDF handoff preserves original URI, page count, and native streaming',async()=>{
 const pdf={pdf:{uri:'content://google/scanner/123',pageCount:3}};
 let payload;
 const saved=await persistMlKitPdf(pdf,{now:()=>1762870000000,importPdf:async x=>{
   payload=x;return {uri:'content://media/external/file/51',name:x.name};
 }});
 assert.deepEqual(payload,{uri:'content://google/scanner/123',name:'RivoScan_Scan_1762870000000.pdf'});
 assert.equal(saved.pageCount,3);
 assert.equal(saved.uri,'content://media/external/file/51');
 await assert.rejects(persistMlKitPdf({scannedImages:['page1.jpg']},{importPdf:async()=>({uri:'anything'})}),/PDF URI/);
 await assert.rejects(persistMlKitPdf(pdf,{importPdf:async()=>({})}),/not persisted/);
 const native=read('native/android/RivoDocumentsPlugin.java');
 for(const token of ['public void importScannedPdf(PluginCall call)','resolver.openInputStream(source)','magic[0]','resolver.insert(documentsCollection(),meta)','IS_PENDING,0','200L*1024L*1024L'])
  assert.ok(native.includes(token),token);
 assert.ok(!native.slice(native.indexOf('public void importScannedPdf('),native.indexOf('public void saveFile(')).includes('Base64.decode'));
});

test('Approved selection bar has six icons and labels, in requested order',()=>{
 const bulk=read('src/library-bulk.js');
 const bar=bulk.slice(bulk.indexOf('function toolbar()'),bulk.indexOf('const isImage='));
 const actions=[...bar.matchAll(/compactAction\('([^']+)'/g)].map(x=>x[1]);
 assert.deepEqual(actions,['cancel','all','delete','organize','merge','share']);
 const css=read('src/rivo-design-system.css');
 for(const s of ['#fff!important','repeat(6,minmax(0,1fr))','button[data-bulk="delete"] svg','.rivo-action-label'])
  assert.ok(css.includes(s),s);
});

test('ARM64 lightweight build only filters the APK test artifact',()=>{
 const gradle=read('rivoscan-version.gradle'),ci=read('.github/workflows/rivoscan-standalone-android.yml');
 assert.ok(gradle.includes("project.findProperty('rivoArmOnly')"));
 assert.ok(gradle.includes("abiFilters 'arm64-v8a'"));
 assert.ok(ci.includes('-PrivoArmOnly=true'));
});
