import test from 'node:test';import assert from 'node:assert/strict';
import {signedInkMask,estimateDocumentShift,fuseDocumentFramesRGBA,inspectInkChanges,perfectScanRGBA} from '../src/perfect-scan-core.js';
const make=(w=240,h=280,dx=0,dy=0)=>{const a=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;let ink=false;
  // Multiple asymmetric text-like strokes and a blue official seal.
  for(const yy of [53,77,117,143,194])if(y-dy>=yy&&y-dy<yy+3&&x-dx>32&&x-dx<195-(yy%23))ink=true;
  if(x-dx>=63&&x-dx<66&&y-dy>31&&y-dy<238)ink=true;
  const stamp=(x-dx-178)**2+(y-dy-214)**2<10**2;
  a[i]=stamp?27:ink?24:x<120?180:239;
  a[i+1]=stamp?60:ink?24:x<120?180:239;
  a[i+2]=stamp?195:ink?24:x<120?180:239;a[i+3]=255;
 }
 return a;};
test('Geometric shift uses actual document ink, not fictional recognition',()=>{
 const w=240,h=280,base=make(w,h),shifted=make(w,h,4,-2);
 const align=estimateDocumentShift(base,shifted,w,h);
 assert.ok(align.confidence>.68,JSON.stringify(align));
 assert.equal(align.dx,4);assert.equal(align.dy,-2);
 const blank=new Uint8ClampedArray(w*h*4).fill(255);
 assert.equal(estimateDocumentShift(blank,blank,w,h).confidence,0);
});
test('Multi-photo fusion preserves dark signatures and blue stamps and never mutates source',()=>{
 const w=240,h=280,src=make(w,h),original=src.slice();
 const changed=make(w,h,4,-2);
 // Second frame with lighter shaded-paper background.
 for(let y=0;y<h;y++)for(let x=0;x<90;x++){const p=(y*w+x)*4;if(changed[p]===180){changed[p]=changed[p+1]=changed[p+2]=222;}}
 const out=fuseDocumentFramesRGBA(src,w,h,[{data:changed}]);
 assert.equal(out.used,1,JSON.stringify(out));
 assert.ok(out.pixels[(21*w+20)*4]>src[(21*w+20)*4]);
 assert.equal(out.pixels[(54*w+86)*4],24);
 const p=(214*w+178)*4;assert.equal(out.pixels[p+2],195);
 assert.deepEqual(src,original);
 const guard=inspectInkChanges(src,out.pixels,w,h);
 assert.equal(guard.severe,0);assert.equal(guard.colorChanged,0);
});
test('Different document rejected rather than merged and zero strength keeps source untouched',()=>{
 const w=240,h=280,src=make(w,h),blank=new Uint8ClampedArray(src.length).fill(255);
 const r=perfectScanRGBA(src,w,h,{creaseStrength:0,extraFrames:[{data:blank}],geometry:false});
 assert.equal(r.usedFrames,0);assert.ok(r.rejectedFrames.length);
 assert.deepEqual(r.pixels,src);
 assert.equal(r.integrity.changed,0);
});
test('Contrast restoration is copy-on-write and reports risky edits',()=>{
 const w=240,h=280,src=make(w,h),after=src.slice();
 const idx=(54*w+85)*4;after[idx]=after[idx+1]=after[idx+2]=255;
 const diag=inspectInkChanges(src,after,w,h);
 assert.ok(diag.changed>0);
 assert.ok(signedInkMask(src,w,h)[54*w+85]);
 const out=perfectScanRGBA(src,w,h,{geometry:false});
 assert.notStrictEqual(out.pixels,src);assert.ok(out.pixels[(10*w+10)*4]>src[(10*w+10)*4]);
 assert.deepEqual(src,make(w,h));
});
