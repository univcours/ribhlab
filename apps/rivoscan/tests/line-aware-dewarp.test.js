import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateLineWarp,remapLineWarpRGBA} from '../src/line-aware-dewarp.js';
import {readFileSync} from 'node:fs';

test('Content-derived vertical warp straightens simulated curved printed text',()=>{
 const w=420,h=360,source=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){const at=i*4;source[at]=source[at+1]=source[at+2]=242;source[at+3]=255}
 const baseline=[62,120,182,247,300];
 for(let x=0;x<w;x++){
  const warp=12*Math.pow(x/(w-1),1.8);
  for(const y of baseline){
   const atY=Math.round(y+warp*Math.sin(Math.PI*y/h));
   for(let dy=-1;dy<=1;dy++){const at=((atY+dy)*w+x)*4;source[at]=source[at+1]=source[at+2]=19}
  }
 }
 const original=source.slice(),estimate=estimateLineWarp(source,w,h,'right');
 assert.ok(estimate.confidence>=.25,'enough repeated text lines for a real estimate');
 assert.ok(estimate.anchors.length>=4,'multiple horizontal displacement estimates');
 const corrected=remapLineWarpRGBA(source,w,h,estimate);
 const where=x=>{let values=[];for(const target of baseline){
  let best=target,lum=999;for(let y=target-22;y<=target+22;y++){
   const at=(y*w+x)*4;if(corrected[at]<lum){lum=corrected[at];best=y}
  }values.push(best)
 }return values};
 const outer=where(45),spine=where(375);
 const meanError=outer.reduce((total,y,i)=>total+Math.abs(y-spine[i]),0)/baseline.length;
 assert.ok(meanError<8,'line-aware correction should reduce synthetic page curvature');
 assert.deepEqual(source,original,'always preserve original image');
});
test('Blank pages do not trigger invented line corrections',()=>{
 const w=280,h=220,rgba=new Uint8ClampedArray(w*h*4).fill(250);
 assert.deepEqual(estimateLineWarp(rgba,w,h,'left'),{anchors:[],confidence:0});
 assert.throws(()=>estimateLineWarp(rgba,20,h));
 assert.throws(()=>remapLineWarpRGBA(rgba,w,h,{anchors:[{x:.3,shift:.7}]}));
});
test('Both Book Scan preview and exported PDF apply content derived warp',()=>{
 const book=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(book.includes('estimateLineWarp(raw.data,w,preview.height,side)'));
 assert.ok((book.match(/applyLineWarpCanvas\(/g)||[]).length>=2);
 assert.ok(book.includes('autoLineWarp=null'));
});