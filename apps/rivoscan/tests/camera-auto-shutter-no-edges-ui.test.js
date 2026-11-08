import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
test('auto shutter only fires on stable real edges with a readable frame',()=>{
 assert.match(s,/class AutoShutterGate/);
 assert.match(s,/stableFrames>=6 && timestamp-stableSince>=1000/);
 assert.match(s,/Math\.abs\(area\)\*\.5>=\.14/);
 assert.match(s,/readableLuma\(pixels,width,height\)/);
 assert.match(s,/autoShutterGate\.observe\(points,analysisStamp,qualityOk\)/);
 assert.match(s,/takePicture\(\);/);
});
test('native camera has no manual shutter button or Edges button, yet keeps four-corner review and retake',()=>{
 const camera=s.slice(s.indexOf('private void showCamera(){'),s.indexOf('private void setBatch('));
 assert.doesNotMatch(camera,/new Shutter\(this\)/);
 assert.match(camera,/AUTO/);
 const review=s.slice(s.indexOf('private void showCaptureReview('),s.indexOf('private String cropHint('));
 assert.match(review,/editor\.setDocument\(bitmap,null\)/);
 assert.doesNotMatch(review,/button\(trNative\("detect"\)/);
 assert.match(review,/button\(trNative\("retake"\)/);
 assert.match(review,/button\("✓",this::approveCapturedPhoto\)/);
 assert.match(s,/requestCropEdges\(bitmap,editor,false\)/);
});
test('auto shutter resets on camera change and on capture failure',()=>{
 assert.match(s,/autoShutterGate\.reset\(\)/);
 assert.match(s,/onError\(@NonNull androidx\.camera\.core\.ImageCaptureException e\)\{captureInProgress=false;autoShutterGate\.reset\(\)/);
});
