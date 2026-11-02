import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDocumentShadowsRGBA} from '../src/document-shadows.js';
import {estimateBookSpine} from '../src/book-spine.js';
import {readFileSync} from 'node:fs';
test('No Shadow brightens uneven white page but protects black print and blue stamp',()=>{
 const w=240,h=160,src=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;src[i]=src[i+1]=src[i+2]=x<120?156:231;src[i+3]=255}
 for(let y=40;y<110;y++){let p=(y*w+46)*4;src[p]=30;src[p+1]=67;src[p+2]=140;p=(y*w+158)*4;src[p]=src[p+1]=src[p+2]=20}
 for(let y=55;y<95;y++){const p=(y*w+76)*4;src[p]=src[p+1]=src[p+2]=108}
 const original=src.slice(),out=normalizeDocumentShadowsRGBA(src,w,h);
 assert.ok(Math.abs(out[(15*w+16)*4]-out[(15*w+222)*4])<18);
 assert.ok(out[(80*w+46)*4+2]>out[(80*w+46)*4]+75);
 assert.ok(out[(80*w+158)*4]<50);
 assert.ok(out[(80*w+76)*4]<175);
 assert.deepEqual(src,original);assert.equal(out[(15*w+16)*4+3],255);
});
test('Book gutter requires consistent dark vertical center, not imaginary guesses',()=>{
 const w=480,h=320,rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4,v=Math.abs(x-257)<9?72:235;
  rgba[p]=rgba[p+1]=rgba[p+2]=v;rgba[p+3]=255;
 }
 const r=estimateBookSpine(rgba,w,h);
 assert.ok(r.confidence>.5);assert.ok(Math.abs(r.spine-54)<3);
 const blank=new Uint8ClampedArray(rgba.length).fill(255);
 assert.deepEqual(estimateBookSpine(blank,w,h),{spine:50,confidence:0});
 assert.throws(()=>estimateBookSpine(blank,10,320));
});
test('No Shadow and find-spine logic are connected to actual image tools',()=>{
 const edit=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 const book=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(edit.includes('normalizeDocumentShadowsRGBA(scan.data,preview.width,preview.height)'));
 assert.ok(book.includes('estimateBookSpine('));
 assert.ok(book.includes('slider.value=String(result.spine);autoPageWarp=null;autoLineWarp=null;draw()'));
});
