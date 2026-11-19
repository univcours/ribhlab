import test from 'node:test';import assert from 'node:assert/strict';
import {reducePaperCreasesRGBA} from '../src/crease-reduce.js';
import {readFileSync} from 'node:fs';
test('Wrinkle-shadow cleanup retains signature darkness and blue stamp chroma',()=>{
 const w=300,h=200,src=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const at=(y*w+x)*4,val=x<150?149:235;src[at]=src[at+1]=src[at+2]=val;src[at+3]=255;
 }
 for(let y=72;y<78;y++)for(let x=30;x<260;x++){const p=(y*w+x)*4;src[p]=src[p+1]=src[p+2]=28;}
 for(let y=105;y<119;y++)for(let x=20;x<70;x++){const p=(y*w+x)*4;src[p]=33;src[p+1]=64;src[p+2]=198;}
 const original=src.slice(),out=reducePaperCreasesRGBA(src,w,h);
 assert.deepEqual(src,original);
 assert.ok(out[(20*w+20)*4]>src[(20*w+20)*4],'dim paper brightens');
 assert.ok(out[(20*w+20)*4]>205,'shadow reduced');
 assert.ok(out[(74*w+150)*4]<55,'signature dark stays dark');
 const j=(109*w+39)*4;assert.ok(out[j+2]>out[j]*2,'blue mark stays blue');
 assert.equal(out[j+3],255);
});
test('Invalid crease processing geometry rejected',()=>assert.throws(()=>reducePaperCreasesRGBA([],0,1)));
test('Scan editor exposes real wrinkle reduction, guarded 2D flatten and compare',()=>{
 const s=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 assert.ok(s.includes("filter==='crease'"));
 assert.ok(s.includes('reducePaperCreasesRGBA(scan.data'));
 assert.ok(s.includes('estimateTextGridWarp('));
 assert.ok(s.includes('applyTextGridCanvas(preview'));
 assert.ok(s.includes("data-edit=\"compare\""));
 assert.ok(s.includes('RivoScan_Enhanced_'));
});

test('Wrinkle-strength slider is monotonic and 0% is a true immutable original copy',()=>{
 const w=200,h=160,src=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4,v=x<100?153:224;
  src[p]=src[p+1]=src[p+2]=v;src[p+3]=255;
 }
 const before=src.slice();
 const off=reducePaperCreasesRGBA(src,w,h,{strength:0});
 const moderate=reducePaperCreasesRGBA(src,w,h,{strength:50});
 const strong=reducePaperCreasesRGBA(src,w,h,{strength:100});
 const at=(12*w+12)*4;
 assert.deepEqual(off,before);
 assert.ok(strong[at]>=moderate[at]&&moderate[at]>before[at]);
 assert.deepEqual(src,before);
 assert.throws(()=>reducePaperCreasesRGBA(src,w,h,{strength:101}));
 const editor=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 assert.ok(editor.includes('data-adjust="creaseStrength"'));
 assert.ok(editor.includes('strength:creaseStrength'));
 assert.ok(editor.includes("hidden=filter!=='crease'"));
});
