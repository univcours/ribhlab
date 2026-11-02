import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=get('src/main.js');
const native=get('native/android/RivoLiveScannerActivity.java');
const plugin=get('native/android/RivoLiveScannerPlugin.java');
const files=get('native/android/RivoDocumentsPlugin.java');
const hub=get('src/tools-hub.js');

test('User scanner settings are applied to native CameraX, not UI-only decoration',()=>{
 for(const key of ['autoClean','keepOriginal','batchDefault','highQuality','jpegQuality','enhancement']){
  assert.ok(plugin.includes('intent.putExtra("'+key+'"'),key);
  assert.ok(native.includes('getIntent().get'),key);
 }
 assert.ok(main.includes('RivoLiveScanner.scan({gallery,imageUri,language,mode,...prefs})'));
 assert.ok(main.includes('updateScanPref(localStorage'));
 assert.ok(main.includes('scannerPreferenceRows()'));
 assert.ok(native.includes('autoCleanEnabled?defaultEnhancement:RivoDocumentEnhancer.ORIGINAL'));
 assert.ok(native.includes('if(saveOriginal)backupOriginalPage(source)'));
 assert.ok(native.includes('Bitmap.CompressFormat.JPEG,scanJpegQuality'));
});
test('Preserves scan ink: native enhancement is not repeated in PDF assembly',()=>{
 assert.ok(main.includes("imagesToPdf('color',picked)"));
 assert.ok(!main.includes("imagesToPdf('enhance',picked)"));
 assert.ok(main.includes('if(!prefs.autoSavePdf)'));
 assert.ok(main.includes("pageSize==='letter'?[612,792]:[595.28,841.89]"));
});
test('ID card mode captures front and back and places both on a single A4 PDF page',()=>{
 assert.ok(native.includes('if("ID Card".equals(scanMode))batchMode=true;'));
 assert.ok(native.includes('if("ID Card".equals(scanMode)&&savedImages.size()>=2)finishWithPages()'));
 assert.ok(native.includes('out.putExtra("scanMode",scanMode)'));
 assert.ok(plugin.includes('data.put("scanMode"'));
 assert.ok(main.includes("result.scanMode==='ID Card'"));
 assert.ok(main.includes('async function idCardToPdf(pages)'));
 assert.ok(main.includes("page.drawText(i===0?'FRONT':'BACK'"));
});
test('Android PrintManager is truly wired for user-owned RivoScan PDFs',()=>{
 assert.ok(files.includes('public void printFile(PluginCall call)'));
 assert.ok(files.includes('Uri original=verifiedUri(call)'));
 assert.ok(files.includes('PrintManager'));
 assert.ok(files.includes('new PrintDocumentAdapter()'));
 assert.ok(main.includes('RivoDocuments.printFile({uri:doc.uri})'));
 assert.ok(hub.includes("printPdf:{icon:'file',color:'sky',type:'libraryPrint'}"));
});
