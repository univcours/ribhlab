import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const activity=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
const processor=readFileSync(new URL('../native/android/RivoDocumentEnhancer.java',import.meta.url),'utf8');
const locale=readFileSync(new URL('../native/android/RivoLocale.java',import.meta.url),'utf8');
const nativeInstall=readFileSync(new URL('../install-live-scanner.ps1',import.meta.url),'utf8');
test('Saving native scans requires perspective crop, enhancement preview and explicit check',()=>{
 assert.ok(activity.includes('RivoEdgeDetector.warp(source,corners)'));
 assert.ok(activity.includes('private void showEnhancementPreview()'));
 assert.ok(activity.includes('button("✓  "+trNative("enhanceDone"),this::saveEnhancedPage)'));
 assert.ok(activity.includes('RivoDocumentEnhancer.apply(input,preset)'));
 assert.ok(activity.includes('if(batchMode)showCamera();else finishWithPages();'));
 assert.ok(!activity.includes('button(trNative("savePage"),this::saveCroppedPage)'));
});
test('Native enhancement modes operate on pixels, preserving document color or B&W',()=>{
 for(const feature of ['static Bitmap apply','COLOR_RGB2Lab','createCLAHE','adaptiveThreshold','Core.divide','Core.addWeighted']){
  assert.ok(processor.includes(feature),feature);
 }
 for(const preset of ['ORIGINAL','ENHANCE','MAGIC','SHADOW','BW','WHITEBOARD']){
  assert.ok(new RegExp('\\b'+preset+'\\s*=').test(processor),preset);
 }
});
test('All-language native stage and native source included in Android wrapper',()=>{
 for(const item of ['enhanceNext','enhanceSmart','enhanceShadow','enhanceSaving','enhanceDone']){
  assert.ok(locale.includes(item),item);
 }
 assert.ok(nativeInstall.includes('RivoDocumentEnhancer.java'));
});

test('The first crop check automatically cleans without requiring a manual filter choice',()=>{
 assert.ok(activity.includes('button("✓  "+trNative("autoCleanSave"),this::autoCleanAndSave)'));
 assert.ok(activity.includes('button(trNative("enhanceFilters"),this::prepareEnhancementPreview)'));
 assert.ok(activity.includes('RivoDocumentEnhancer.apply(straight,RivoDocumentEnhancer.AUTO)'));
 assert.ok(activity.includes('backupOriginalPage(source)'));
 assert.ok(processor.includes('AUTO="auto"'));
 assert.ok(processor.includes('Core.addWeighted(rgb,0.82,originalRGB,0.18,0,rgb)'));
 const firstCrop=activity.slice(activity.indexOf('private void openEditor('),activity.indexOf('private void releaseEnhancement()'));
 assert.ok(firstCrop.includes('this::autoCleanAndSave'));
 assert.ok(!firstCrop.includes('button(trNative("enhanceNext"),this::prepareEnhancementPreview)'));
});
