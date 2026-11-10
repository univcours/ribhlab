import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('AI Solver camera photo is locally resized and selected, then upload requires a separate confirmation',()=>{
 const src=readFileSync(new URL('../src/document-ai.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(src.includes("mode==='solver'&&capture"));
 assert.ok(src.includes('const uri=await capture()'));
 assert.ok(src.includes("canvas.toBlob(b=>b?ok(b)"));
 assert.ok(src.includes("lastFile=new File([optimized]"));
 assert.ok(src.includes('window.confirm(L[13])'));
 assert.ok(main.includes("openDocumentAI({mode:spec.type==='aiDocument'?'chat':'solver',language,capture:async()=>"));
 assert.ok(src.indexOf("lastFile=new File([optimized]")<src.indexOf('requestUserAI({apiKey:key.value,request})'));
 assert.ok(src.includes("key.value=''"));
});

test('Smart AutoCapture is on by default, needs sharp stable page, and retains manual capture',()=>{
 const activity=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
 const bridge=readFileSync(new URL('../native/android/RivoLiveScannerPlugin.java',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(bridge.includes('intent.putExtra("autoCapture"'));
 assert.ok(activity.includes('autoCaptureEnabled=!basicCameraMode&&getIntent().getBooleanExtra("autoCapture",true)'));
 for(const gate of ['updateAutoCapture(Point[] corners,double sharpness,long now)',
  'goodAutoPage(corners)','sharpness<48','now-autoStableSince>=1200',
  'autoStableFrames>=5','maxDrift>.022','autoCaptureTriggered=true','takePicture();'])
  assert.ok(activity.includes(gate),gate);
 assert.ok(activity.includes('RivoEdgeDetector.detectGray(oriented)'));
 assert.ok(activity.includes('updateAutoCapture(points,sharpness,analysisStamp)'));
 assert.ok(activity.includes('private void toggleAutoCapture()'));
 assert.ok(activity.includes('autoCaptureTriggered=false;resetAutoCaptureHold()'));
 assert.ok(main.includes('autoCapture:true'));
 assert.ok(main.includes('language,mode,...prefs,autoCapture:useAutoCapture'));
 assert.ok(main.includes('prefs.autoCapture'));
 assert.ok(bridge.includes('call.getBoolean("autoCapture",true)'));

});
