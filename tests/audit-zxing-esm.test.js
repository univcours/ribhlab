import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QRCodeWriter,Code39Reader,BarcodeFormat} from '@zxing/library';
import {scanMultiplePixels} from '../src/code-multi-scan.js';

function rasterize(matrix){
 const w=matrix.getWidth(),h=matrix.getHeight(),rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const o=(y*w+x)*4,val=matrix.get(x,y)?0:255;
  rgba[o]=val;rgba[o+1]=val;rgba[o+2]=val;rgba[o+3]=255;
 }
 return {rgba,w,h};
}
function code39Raster(value){
 const alphabet=Code39Reader.ALPHABET_STRING;
 const patterns=[Code39Reader.ASTERISK_ENCODING,
  ...[...value].map(c=>Code39Reader.CHARACTER_ENCODINGS[alphabet.indexOf(c)]),
  Code39Reader.ASTERISK_ENCODING];
 const widths=[...patterns].flatMap((pattern,i)=>{
  const v=[];
  for(let j=0;j<9;j++)v.push({black:j%2===0,width:(pattern&(1<<(8-j)))?5:2});
  if(i<patterns.length-1)v.push({black:false,width:2});
  return v;
 });
 const margin=35,barWidth=widths.reduce((a,b)=>a+b.width,0),w=margin*2+barWidth,h=150;
 const rgba=new Uint8ClampedArray(w*h*4).fill(255);
 let x=margin;
 for(const segment of widths){
  if(segment.black)for(let dx=0;dx<segment.width;dx++)for(let y=12;y<h-12;y++){
   const o=(y*w+x+dx)*4;rgba[o]=0;rgba[o+1]=0;rgba[o+2]=0;
  }
  x+=segment.width;
 }
 return {rgba,w,h};
}
test('ZXing ESM named import and real QR pixel decoding',()=>{
 const source=readFileSync(new URL('../src/code-multi-scan.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/^\s*const.*ZXing\.default/m);
 assert.match(source,/import \{BinaryBitmap,HybridBinarizer,RGBLuminanceSource,MultiFormatReader,DecodeHintType\} from '@zxing\/library'/);
 const payload='RIVOLAB_AUDIT_QR_04568';
 const {rgba,w,h}=rasterize(new QRCodeWriter().encode(payload,BarcodeFormat.QR_CODE,280,280,new Map()));
 const data=scanMultiplePixels(rgba,w,h,{maxResults:8});
 assert.ok(data.some(x=>x.getText()===payload),'Generated QR not decoded from actual pixels');
});
test('ZXing recognizes independently rendered Code39 barcode pattern from pixels',()=>{
 const payload='RIVO45';const {rgba,w,h}=code39Raster(payload);
 const data=scanMultiplePixels(rgba,w,h,{maxResults:8});
 assert.ok(data.some(x=>x.getText()===payload),'Generated Code39 not decoded from real pixels');
});
test('Blank pixels do not produce false codes',()=>{
 const w=160,h=160,rgba=new Uint8ClampedArray(w*h*4).fill(255);
 assert.deepEqual(scanMultiplePixels(rgba,w,h),[]);
});
