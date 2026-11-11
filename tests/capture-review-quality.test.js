import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Native CameraX capture analyzes blur, lighting, glare and document boundaries before Save/Retake',()=>{
 const quality=src('native/android/RivoCaptureQuality.java');
 const camera=src('native/android/RivoLiveScannerActivity.java');
 for(const marker of ['Imgproc.Laplacian','Core.meanStdDev','glareFraction',
  'meanLight','hasEdges','retakeSuggested','summary(String language)'])
  assert.ok(quality.includes(marker),marker);
 for(const marker of ['private void openEditor(Bitmap bitmap)','captureQualitySerial',
 'RivoCaptureQuality.analyze(bitmap,found)','this::prepareEnhancementPreview',
 'this::showCamera','this::saveEnhancedPage','private void commitEnhancedPage()',
 'enhancementProgress','RivoCaptureQuality.analyze(bitmap,found)'])
  assert.ok(camera.includes(marker),marker);
 const start=camera.indexOf('private void openEditor(Bitmap bitmap)');
 const end=camera.indexOf('private void autoCleanAndSave()',start);
 assert.ok(!camera.slice(start,end).includes('this::autoCleanAndSave'),
  'First crop screen must not bypass user review and save directly');
 assert.ok(camera.includes('private void saveEnhancedPage()'));
 assert.ok(camera.includes('commitEnhancedPage();'));
 assert.ok(!camera.slice(camera.indexOf('private void saveEnhancedPage()'),camera.indexOf('private void commitEnhancedPage()')).includes('AlertDialog.Builder'),'save check must not show a second prompt');
});
test('Native enhanced image maintains high-quality source resolution when HD selected',()=>{
 const camera=src('native/android/RivoLiveScannerActivity.java');
 const edge=src('native/android/RivoEdgeDetector.java');
 assert.ok(camera.includes('highQuality?3300:2150'));
 assert.ok(camera.includes('3600.0/Math.max(input.getWidth()'));
 assert.ok(edge.includes('Math.min(3400,maxLongSide)'));
 assert.ok(edge.includes('RivoEdgeDetector')===false || edge.includes('warp(Bitmap bitmap,Point[] normalized,int maxLongSide)'));
});

test('Enhancement preview has Retake, Compare and ✓ Save but no Edges button or alarm banner',()=>{
 const camera=src('native/android/RivoLiveScannerActivity.java');
 const preview=camera.slice(camera.indexOf('private void showEnhancementPreview()'),
                             camera.indexOf('private void renderEnhancementPreview('));
 const save=camera.slice(camera.indexOf('private void saveEnhancedPage()'),
                          camera.indexOf('private void commitEnhancedPage()'));
 assert.ok(preview.includes('button(trNative("retake"),this::showCamera)'));
 assert.ok(preview.includes('button(trNative("enhanceCompare")'));
 assert.ok(!preview.includes('button(trNative("enhanceBack")'));
 assert.ok(!preview.includes('captureQuality.summary(nativeLanguage)'));
 assert.ok(!save.includes('AlertDialog.Builder'));
 assert.ok(save.includes('commitEnhancedPage()'));
 assert.ok(camera.includes('editor.setDocument(bitmap,found)'),'four-corner drag still available');
});
