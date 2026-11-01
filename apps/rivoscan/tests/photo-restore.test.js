import test from 'node:test';
import assert from 'node:assert/strict';
import {restorePhotoPixels} from '../src/photo-restore.js';
test('Offline denoiser keeps high contrast strokes and alpha while reducing mild color noise',()=>{
 const w=7,h=7,a=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;a[i]=a[i+1]=a[i+2]=220;a[i+3]=255}
 // Dark ink line must not bleed into the surrounding white paper.
 for(let y=1;y<h-1;y++){const i=(y*w+2)*4;a[i]=a[i+1]=a[i+2]=12}
 const n=(3*w+4)*4;a[n]=205;a[n+1]=207;a[n+2]=209;
 const b=restorePhotoPixels(a,w,h);
 assert.ok(b[n]>205&&b[n+1]>207,'noise should be smoothed towards white paper');
 assert.ok(b[(3*w+2)*4]<20,'ink must remain dark');
 assert.equal(b[n+3],255);
});
test('Restore rejects impossible images',()=>assert.throws(()=>restorePhotoPixels(new Uint8ClampedArray(10),3,3)));
