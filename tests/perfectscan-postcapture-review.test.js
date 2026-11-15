import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detectCaptureCorners} from '../src/perfectscan-capture-review.js';
import {validEdgeQuadrilateral} from '../src/edge-adjustment.js';

function image(width,height,paint){
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,[r,g,b]=paint(x,y);
  data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;
 }
 return {width,height,data};
}
test('PerfectScan auto-detects a real bright page on a dark tabletop after photo capture',()=>{
 const photo=image(360,500,(x,y)=>x>=49&&x<=300&&y>=63&&y<=441?[244,240,230]:[23,45,62]);
 const detected=detectCaptureCorners(photo);
 assert.ok(detected,'bright page should be discovered automatically');
 assert.equal(detected.source,'light-paper');
 assert.ok(validEdgeQuadrilateral(detected.points));
 const expected=[[49/360,63/500],[300/360,63/500],[300/360,441/500],[49/360,441/500]];
 detected.points.forEach((p,i)=>{
  assert.ok(Math.abs(p[0]-expected[i][0])<.035,'corner '+i+' x: '+p[0]);
  assert.ok(Math.abs(p[1]-expected[i][1])<.035,'corner '+i+' y: '+p[1]);
 });
});
test('PerfectScan does not invent a selection rectangle when no page is distinguishable',()=>{
 const uniform=image(320,480,()=>[207,207,207]);
 assert.equal(detectCaptureCorners(uniform),null);
 const dark=image(320,480,()=>[20,28,31]);
 assert.equal(detectCaptureCorners(dark),null);
});
test('PerfectScan rejects images without usable pixels instead of auto-drawing false corners',()=>{
 assert.equal(detectCaptureCorners({width:4,height:4,data:new Uint8ClampedArray(4*4*4)}),null);
 assert.equal(detectCaptureCorners({width:300,height:500,data:new Uint8Array(10)}),null);
});
test('PerfectScan review is an independent after-shutter step, before processing and before saving',()=>{
 const ui=readFileSync(new URL('../src/perfect-scan-ui.js',import.meta.url),'utf8');
 const capture=readFileSync(new URL('../src/perfectscan-capture-review.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ads=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(ui,/import \{reviewPerfectScanCapture\} from '.\/perfectscan-capture-review.js'/);
 assert.match(ui,/const reviewed=await reviewPerfectScanCapture\(files\[0\],\{language:lang\}\)/);
 assert.match(ui,/if\(!reviewed\)return/);
 assert.match(ui,/await setBase\(reviewed.file,reviewed.original.name,originalBytes/);
 assert.match(ui,/originalPhotoPreserved:true/);
 assert.match(ui,/await onSave\(base.bytes/);
 assert.match(capture,/if\(!corners\)\{finish\(\{file,original:file,detected:Boolean\(detected\),cropped:false/);
 assert.match(capture,/perspectiveCropImageData\(pixels,corners\)/);
 assert.match(main,/import '.\/perfectscan-capture-review.css'/);
 assert.match(main,/await DocumentScanner.scanDocument\(mlkitFullOptions\(mode,pageLimit\)\)/);
 assert.match(ads,/\.rivo-perfect-capture-overlay/);
});
test('PerfectScan review includes touch loupe and no live-camera frame marker',()=>{
 const capture=readFileSync(new URL('../src/perfectscan-capture-review.js',import.meta.url),'utf8');
 assert.match(capture,/if\(selected>=0&&corners\)drawLoupe\(corners\[selected\]\)/);
 assert.match(capture,/cornerLoupeLayout\(canvas.width,canvas.height,p\)/);
 assert.match(capture,/canvas.addEventListener\('pointerdown'/);
 assert.match(capture,/canvas.addEventListener\('pointermove'/);
 assert.match(capture,/for\(const action of \['pointerup','pointercancel','lostpointercapture'\]/);
 assert.match(capture,/className='rivo-perfect-capture-overlay'/);
 assert.doesNotMatch(capture,/cameraView|CameraX|liveOverlay/);
});
