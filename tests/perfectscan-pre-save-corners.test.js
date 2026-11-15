import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimatePerfectScanCorners,perfectScanCornerHit} from '../src/perfect-scan-corners.js';
import {validEdgeQuadrilateral,perspectiveCropImageData} from '../src/edge-adjustment.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('document boundaries are estimated in a clear paper-on-dark-table photo',()=>{
 const width=360,height=460,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const paper=x>=48&&x<308&&y>=58&&y<401;
  const p=(y*width+x)*4;pixels[p]=paper?239:26;
  pixels[p+1]=paper?239:26;pixels[p+2]=paper?239:26;pixels[p+3]=255;
 }
 const estimate=estimatePerfectScanCorners({width,height,data:pixels});
 assert.equal(estimate.detected,true);
 assert.ok(validEdgeQuadrilateral(estimate.corners));
 const [tl,tr,br,bl]=estimate.corners;
 assert.ok(Math.abs(tl[0]-48/width)<.045,'top left horizontal border');
 assert.ok(Math.abs(tl[1]-58/height)<.045,'top left vertical border');
 assert.ok(Math.abs(br[0]-308/width)<.045,'bottom right horizontal border');
 assert.ok(Math.abs(br[1]-401/height)<.045,'bottom right vertical border');
 const corrected=perspectiveCropImageData({width,height,data:pixels},estimate.corners);
 assert.ok(corrected.width>=120&&corrected.height>=120);
 assert.equal(pixels[(20*width+20)*4],26,'original photo remains untouched');
});

test('low contrast background falls back to four editable corners',()=>{
 const w=320,h=410,pixels=new Uint8ClampedArray(w*h*4);
 pixels.fill(160);
 const result=estimatePerfectScanCorners({data:pixels,width:w,height:h});
 assert.equal(result.detected,false);
 assert.equal(result.corners.length,4);
 assert.equal(validEdgeQuadrilateral(result.corners),true);
});
test('corner hit target supports touch radius, ignores taps elsewhere',()=>{
 const c=[[.08,.07],[.92,.07],[.92,.93],[.08,.93]];
 assert.equal(perfectScanCornerHit(c,[.08,.07],390,550),0);
 assert.equal(perfectScanCornerHit(c,[.92,.93],390,550),2);
 assert.equal(perfectScanCornerHit(c,[.5,.5],390,550),-1);
});

test('PerfectScan opens four-corner review immediately after first capture, before any storage save',()=>{
 const ui=read('src/perfect-scan-ui.js'),review=read('src/perfect-scan-corners.js');
 const start=ui.indexOf('async function setBase(');
 const afterSet=ui.indexOf('async function addShots(',start);
 const set=ui.slice(start,afterSet);
 assert.ok(set.includes('pending={data:image.data'));
 assert.ok(set.includes('base=null;extra=[];resetOutput()'));
 assert.ok(set.includes('openPendingCorners()'));
 assert.ok(!set.includes('onSave('),'no save before corner confirmation');
 assert.ok(ui.includes('onApply:async corrected=>'));
 assert.ok(ui.includes('cornerReviewConfirmed:true'));
 assert.ok(ui.includes('if(!base.cornerReviewConfirmed)return'));
 assert.ok(ui.includes("action==='edges'"));
 assert.ok(ui.includes('cornerReview?.isOpen?.()'));
 assert.ok(review.includes('render')===false||review.includes('drawLoupe'));
 assert.ok(review.includes('canvas.setPointerCapture'));
 assert.match(review,/if\(drag<0\)return;[\s\S]*?draw\(\);e\.preventDefault\(\)/);
 assert.ok(review.includes("for(const event of ['pointerup','pointercancel','lostpointercapture'])"));
 assert.ok(!review.includes('onSave('));
 assert.ok(!review.includes('saveFile('));
});

test('retake, source preservation, extra matching photo fusion, cancel and process remain available',()=>{
 const s=read('src/perfect-scan-ui.js');
 assert.match(s,/onCancel:\(\)=>\{/);
 assert.match(s,/if\(closed\|\|base\|\|!pending\)return/);
 assert.match(s,/onSave\(base\.bytes/);
 assert.match(s,/perspectiveCropImageData\(raw,base\.cornerPoints\)/);
 assert.match(s,/base\.width!==corrected\.width|corrected\.width!==base\.width/);
 assert.match(s,/cornerReviewConfirmed:true,cornersNormalized:base\.cornerPoints/);
 assert.match(s,/root\.querySelector\('\[data-perfect="camera"\]'\)\.textContent=t\.capture/);
 assert.match(s,/result\.pixels/);
});
test('Android back closes inner editor first; Arabic interface has no Darija phrases',()=>{
 const main=read('src/main.js'),s=read('src/perfect-scan-ui.js'),corner=read('src/perfect-scan-corners.js');
 assert.ok(main.indexOf("['.rivo-perfect-corners-overlay'")<
  main.indexOf("['.rivo-perfectscan-overlay'"));
 assert.match(main,/import '\.\/rivo-perfect-corners\.css'/);
 const ar=s.split('\n').find(x=>x.startsWith(' ar:{title:'));
 assert.ok(ar?.includes('تم حفظ المستند'));
 assert.doesNotMatch(ar,/اختار|كنتحققو|كنقوّمو|ماشي|بقات|الكاشيات|واجدة/);
 assert.ok(corner.includes('تعديل حواف المستند'));
 assert.ok(corner.includes('تطبيق القص'));
});
