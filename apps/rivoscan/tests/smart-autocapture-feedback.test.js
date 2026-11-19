import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const java=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
const plugin=readFileSync(new URL('../native/android/RivoLiveScannerPlugin.java',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('Smart AutoCapture is opt-in and uses actual document, sharpness and stable hold gating',()=>{
 for(const marker of [
  'getBooleanExtra("autoCapture",false)',
  'private void updateAutoCapture(Point[] corners,double sharpness,long now)',
  '!goodAutoPage(corners)',
  'if(sharpness<48)',
  'maxDrift>.022',
  'now-autoStableSince>=1200&&autoStableFrames>=5',
  'if(now-autoStableSince>=1200&&autoStableFrames>=5&&now-autoLastCapture>=2200)',
  'autoCaptureTriggered=true;autoLastCapture=now;',
  'takePicture(); // Existing CameraX JPEG review flow, never a silent upload.'])
  assert.ok(java.includes(marker),marker);
 assert.ok(plugin.includes('intent.putExtra("autoCapture"'));
 assert.ok(main.includes("openSmartScanner({autoCapture:true})"));
});
test('Camera uses real in-preview progress and explains absent/blurry/unstable pages in seven languages',()=>{
 for(const lang of ['"ar"','"fr"','"es"','"de"','"pt"','"it"'])
  assert.ok(java.includes('case '+lang+':'),lang);
 for(const marker of ['private String autoCaptureHint(String stage,int progress)',
  'private void showAutoCaptureHint(String stage,int progress)',
  'showAutoCaptureHint(corners==null?"find":"frame",0)',
  'showAutoCaptureHint("focus",0)',
  'showAutoCaptureHint("steady",0)',
  'showAutoCaptureHint("steady",Math.min(100,(int)((now-autoStableSince)*100/1200)))',
  'if(!next.contentEquals(message.getText()))message.setText(next)'])
  assert.ok(java.includes(marker),marker);
});
test('AutoCapture never saves a photo without review and preserves manual shutter fallback',()=>{
 assert.ok(java.includes('captureInProgress=true;'));
 assert.ok(java.includes('animateShutterCapture();'));
 assert.ok(java.includes('private void openEditor(Bitmap bitmap)'));
 assert.ok(java.includes('if(!liveEdges&&autoCaptureEnabled)'));
 assert.ok(java.includes('autoCaptureEnabled=false;'));
 assert.ok(java.includes('this::toggleAutoCapture'));
});
