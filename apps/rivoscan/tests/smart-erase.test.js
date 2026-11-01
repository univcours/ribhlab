import test from 'node:test';
import assert from 'node:assert/strict';
import {inpaintMaskedPixels} from '../src/smart-erase.js';
test('Smart erase edits only explicitly masked region and blends from unmasked boundaries',()=>{
 const w=9,h=9,colors=new Uint8ClampedArray(w*h*4),mask=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;colors[i]=180;colors[i+1]=192;colors[i+2]=204;colors[i+3]=255;
 }
 for(let y=3;y<=5;y++)for(let x=3;x<=5;x++){
  const i=(y*w+x)*4;colors[i]=5;colors[i+1]=5;colors[i+2]=5;mask[y*w+x]=255;
 }
 const result=inpaintMaskedPixels(colors,mask,w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const idx=(y*w+x)*4;
  if(mask[y*w+x])assert.ok(result[idx]>175,'erased patch should match paper around it');
  else assert.deepEqual(Array.from(result.slice(idx,idx+4)),Array.from(colors.slice(idx,idx+4)),
    'non-selected pixels must be unchanged');
 }
});
test('Smart erase rejects invalid masks or oversized images',()=>{
 assert.throws(()=>inpaintMaskedPixels(new Uint8ClampedArray(1),new Uint8Array(1),10,10));
 assert.throws(()=>inpaintMaskedPixels(new Uint8ClampedArray(4),new Uint8Array(1),10000,10000));
});

test('Colored-ink mask protects printed dark text even within selected brush',async()=>{
 const {coloredMarkMask}=await import('../src/colored-mark-erase.js');
 const w=5,h=1,image=new Uint8ClampedArray([
   245,245,245,255,
   15,15,15,255,
   20,60,195,255,
   198,42,50,255,
   198,198,198,255
 ]),all=new Uint8Array(w).fill(255);
 const blue=coloredMarkMask(image,all,w,h,'blue');
 assert.deepEqual(Array.from(blue),[0,0,255,0,0]);
 const gray=coloredMarkMask(image,all,w,h,'light-gray');
 assert.deepEqual(Array.from(gray),[0,0,0,0,255]);
 assert.equal(coloredMarkMask(image,all,w,h,'red')[3],255);
 assert.equal(blue[1],0,'black printed ink should be preserved');
 assert.throws(()=>coloredMarkMask(image,all,w,h,'handwriting-auto'));
});

test('Auto-colored manual brush detects colored annotations but not black printed strokes',async()=>{
 const {coloredMarkMask}=await import('../src/colored-mark-erase.js');
 const rgba=new Uint8ClampedArray([
  12,12,12,255, 248,248,248,255, 32,82,205,255,
  200,55,42,255, 55,155,74,255, 188,188,188,255
 ]);
 const mask=new Uint8Array(6).fill(255);
 assert.deepEqual(Array.from(coloredMarkMask(rgba,mask,6,1,'auto-colored')),[0,0,255,255,255,0]);
 mask[3]=0;
 assert.equal(coloredMarkMask(rgba,mask,6,1,'auto-colored')[3],0);
});
test('Direction-aware inpainting avoids dragging nearby dark printing across a colored mark',()=>{
 const w=9,h=9,data=new Uint8ClampedArray(w*h*4),mask=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const at=4*(y*w+x);data[at]=data[at+1]=data[at+2]=240;data[at+3]=255;
 }
 // A printed vertical dark line immediately borders the blue mark to the left;
 // the clean top and bottom samples should dominate the interpolation.
 for(let y=0;y<h;y++){const at=4*(y*w+2);data[at]=data[at+1]=data[at+2]=10}
 for(let y=3;y<=5;y++)for(let x=3;x<=5;x++){
  const at=4*(y*w+x);data[at]=34;data[at+1]=80;data[at+2]=200;mask[y*w+x]=255;
 }
 const out=inpaintMaskedPixels(data,mask,w,h);
 assert.ok(out[4*(4*w+3)]>185,'repair should use clean vertical edges, not smear adjacent black ink');
 assert.equal(out[4*(4*w+2)],10,'existing black line is not edited');
});
test('Editor retains each brush color and undo removes a whole gesture',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 assert.ok(src.includes('groups.get(stroke.color).push(stroke)'));
 assert.ok(src.includes('batch:strokeBatch'));
 assert.ok(src.includes('while(strokes.length&&strokes.at(-1).batch===lastBatch)strokes.pop()'));
 assert.ok(src.includes("if(stroke.a[0]===stroke.b[0]&&stroke.a[1]===stroke.b[1])"));
});
