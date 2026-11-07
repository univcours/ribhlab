import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Photo confirmation and filter preview before Done',()=>{
 const j=read('native/android/RivoLiveScannerActivity.java');
 for(const x of ['showCaptureReview(bmp)','showCaptureReview(img)',
 'localizedCapture("confirm")','localizedCapture("done")',
 'if(openCvReady&&editor!=null)prepareEnhancementPreview()'])assert.ok(j.includes(x),x);
 assert.ok(!j.includes('publishPageCopy(saved);'));
 assert.ok(!j.includes('publishPageCopy(target);'));
});
test('PDF-only scans, temporary JPGs on Share',()=>{
 const m=read('src/main.js'),b=read('src/library-bulk.js'),j=read('native/android/RivoDocumentsPlugin.java');
 const i=read('install-live-scanner.ps1');
 const scan=m.slice(m.indexOf('async function consumeSmartScan('),m.indexOf('async function openSmartScanner('));
 assert.ok(scan.includes('await saveOut(pdf,'));
 assert.ok(!scan.includes('if(!prefs.autoSavePdf)'));
 assert.ok(m.includes('await openLiveScanner()'));
 assert.ok(b.includes('await bridge.shareJpgPages({imagesBase64})'));
 assert.ok(!b.includes('const saved=await bridge.saveFile({name:'));
 assert.ok(j.includes('public void shareJpgPages(PluginCall call)'));
 assert.ok(j.includes('FileProvider.getUriForFile'));
 assert.ok(i.includes('rivoscan_share_paths.xml'));
});
test('New horizontal right-side actions, no ADS or forced video',()=>{
 const m=read('src/main.js'),css=read('src/premium-home.css'),ads=read('src/monetization.js');
 assert.ok(!m.includes('>ADS<'));
 assert.ok(css.includes('flex-flow:row nowrap!important'));
 assert.ok(css.includes('bottom:calc(172px + env(safe-area-inset-bottom,0px))!important'));
 assert.ok(ads.includes('requestPremium(){return true;}'));
});
