import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateTextGridWarp,remapTextGridRGBA} from '../src/text-grid-dewarp.js';
import {readFileSync} from 'node:fs';
test('2D text band correction follows different bends at top and bottom',()=>{
 const w=420,h=360,src=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){src[4*i]=src[4*i+1]=src[4*i+2]=245;src[4*i+3]=255}
 const baselines=[57,86,113,143,172,204,236,267,295];
 for(let x=0;x<w;x++)for(const base of baselines){
  const amount=(x/(w-1))**2*(4+11*(base/h));
  const y=Math.round(base+amount);
  for(let dy=-1;dy<=1;dy++){const at=((y+dy)*w+x)*4;src[at]=src[at+1]=src[at+2]=18;}
 }
 const before=src.slice(),warp=estimateTextGridWarp(src,w,h,'right');
 assert.ok(warp.confidence>=.28,JSON.stringify({confidence:warp.confidence,rows:warp.rows.length}));
 assert.ok(warp.rows.length>=2);
 const out=remapTextGridRGBA(src,w,h,warp);
 const error=(image)=>{
  let distance=0;
  for(const base of baselines){
   const where=x=>{
    let best=base,value=999;
    for(let y=base-22;y<=base+25;y++){let z=image[(y*w+x)*4];if(z<value){value=z;best=y;}}
    return best;
   };
   distance+=Math.abs(where(50)-where(370));
  }
  return distance/baselines.length;
 };
 assert.ok(error(out)<error(src)*.85,JSON.stringify({before:error(src),after:error(out)}));
 assert.deepEqual(src,before,'original kept intact');
});
test('Blank or illustrated pages abstain; reject invalid warp geometry',()=>{
 const w=280,h=260,src=new Uint8ClampedArray(w*h*4).fill(235);
 assert.deepEqual(estimateTextGridWarp(src,w,h,'left'),{rows:[],confidence:0});
 assert.throws(()=>remapTextGridRGBA(src,w,h,{rows:[{y:.5,anchors:[{x:.5,shift:.4}]}]}));
});
test('Both Book Scan preview and export actually use the 2D correction',()=>{
 const src=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(src.includes('estimateTextGridWarp('));
 assert.ok(src.includes('applyTextGridCanvas('));
 assert.ok(src.includes('autoLineWarp?.[pageIndex]?.rows'));
 assert.ok(src.includes('spread.autoLineWarp?.[regionIndex]?.rows'));
});
