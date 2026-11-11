import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Remove Scan/Convert/Edit/Utilities tabs; keep actual Tools as a three-column grid',()=>{
 const main=read('src/main.js'),css=read('src/compact-turquoise.css');
 const toolUI=main.slice(main.indexOf('function toolsWorkspace(){'),main.indexOf('function scannerPreferenceRows(){'));
 assert.ok(!toolUI.includes('rivo-tool-pills'));
 assert.ok(!main.includes("document.querySelectorAll('[data-hub-section]')"));
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'));
 assert.ok(main.includes("ico('scan',32)"));
});
test('Live scanner uses real four corners and stable sharpness with no counterfeit bounding rectangle',()=>{
 const activity=read('native/android/RivoLiveScannerActivity.java'),edge=read('native/android/RivoEdgeDetector.java');
 assert.ok(activity.includes('RivoEdgeDetector.detectGray(oriented,640)'));
 assert.ok(activity.includes('now-lastAnalysisTime<105'));
 assert.ok(activity.includes('autoStableFrames>=5'));
 assert.ok(edge.includes('Imgproc.approxPolyDP(curve,quad'));
 assert.ok(!edge.includes('new Point(left,top),new Point(right,top)'));
 assert.ok(edge.includes('final double cx=midX/4,cy=midY/4'));
});
test('Pressing native check saves directly, no extra alert, and publicly publishes PDF only',()=>{
 const camera=read('native/android/RivoLiveScannerActivity.java'),main=read('src/main.js');
 assert.ok(camera.includes('private void saveEnhancedPage()'));
 assert.ok(!camera.includes('if(captureQuality!=null&&captureQuality.retakeSuggested)'));
 assert.ok(!camera.includes('private void publishPageCopy('));
 assert.ok(!camera.includes('RivoDocumentsPlugin.saveOriginalScannedImage(this,temp'));
 assert.ok(main.includes('await saveOut(pdf,'));
 assert.ok(!main.includes('await saveOut(new Uint8Array(await page.arrayBuffer())'));
 assert.ok(main.includes('captured?3400:2100'));
});
test('My Files shows small real thumbnail of first PDF page, safely validated',()=>{
 const main=read('src/main.js'),native=read('native/android/RivoDocumentsPlugin.java');
 assert.ok(main.includes('data-thumb-uri='));
 assert.ok(main.includes('RivoDocuments.getThumbnail({uri,width:110,height:150})'));
 assert.ok(main.includes('documentThumbnailCache'));
 assert.ok(native.includes('public void getThumbnail(PluginCall call)'));
 assert.ok(native.includes('new android.graphics.pdf.PdfRenderer(fd)'));
 assert.ok(native.includes('verifiedUri(call)'));
 assert.ok(read('src/premium-home.css').includes('flex-direction:column!important'));
});
test('Share preserves Android system targets for one or several files',()=>{
 const native=read('native/android/RivoDocumentsPlugin.java');
 assert.ok(native.includes('Intent.ACTION_SEND_MULTIPLE'));
 assert.ok(native.includes('Intent.createChooser(share,'));
 assert.ok(native.includes('Intent.FLAG_GRANT_READ_URI_PERMISSION'));
});
