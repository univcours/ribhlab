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
