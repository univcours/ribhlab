import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as ZXing from '@zxing/library';
const {BarcodeFormat,QRCodeWriter}=ZXing.default||ZXing;
import {multiScanRegions,scanMultiplePixels,verifiedUniqueCodes} from '../src/code-multi-scan.js';
import {recognizedCode} from '../src/barcode-scanner.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('multiple-scanner overlaps all page corners and returns a single full-frame pass',()=>{
 const regions=multiScanRegions(800,600,{fine:true});
 assert.deepEqual(regions[0],{x:0,y:0,w:800,h:600});
 assert.ok(regions.length>12);
 assert.ok(regions.some(r=>r.x>0&&r.y>0));
});
test('verified codes from multiple tiles are deduplicated by type AND value',()=>{
 const mk=(text,format)=>({
  getText:()=>text,getBarcodeFormat:()=>format,
  getResultPoints:()=>[{getX:()=>12,getY:()=>20}]
 });
 const source=[mk('ABC',BarcodeFormat.QR_CODE),mk('ABC',BarcodeFormat.QR_CODE),
  mk('6111234567890',BarcodeFormat.EAN_13),mk('6111234567890',BarcodeFormat.EAN_13)];
 const found=verifiedUniqueCodes(source,recognizedCode);
 assert.equal(found.length,2);
 assert.deepEqual(found.map(x=>x.code.format),['QR','EAN13']);
});
test('recognizes two separate QR codes on one actual rendered image',()=>{
 const width=520,height=260;
 const rgba=new Uint8ClampedArray(width*height*4);
 rgba.fill(255);
 const writer=new QRCodeWriter();
 const put=(text,x,y)=>{
  const bits=writer.encode(text,BarcodeFormat.QR_CODE,170,170,new Map());
  for(let yy=0;yy<bits.getHeight();yy++)for(let xx=0;xx<bits.getWidth();xx++){
   if(!bits.get(xx,yy))continue;
   const p=((y+yy)*width+x+xx)*4;
   rgba[p]=0;rgba[p+1]=0;rgba[p+2]=0;
  }
 };
 put('RS-MULTI-FIRST',25,35);
 put('RS-MULTI-SECOND',322,35);
 const found=scanMultiplePixels(rgba,width,height,{fine:true,maxResults:14});
 const values=found.map(r=>r.getText());
 assert.ok(values.includes('RS-MULTI-FIRST'),'missed first QR: '+values.join(','));
 assert.ok(values.includes('RS-MULTI-SECOND'),'missed second QR: '+values.join(','));
 assert.equal(new Set(values).size,values.length);
});
test('blank image never produces invented QR/barcode detections',()=>{
 const blank=new Uint8ClampedArray(300*200*4);blank.fill(255);
 assert.deepEqual(scanMultiplePixels(blank,300,200,{fine:true}),[]);
});
test('UltraScan always shows zoom controls, multi image scanning, live multi counter and auto search',()=>{
 const s=read('src/barcode-scanner.js');
 assert.ok(s.includes('scanMultipleCanvasAsync(multiCanvas'));
 assert.ok(s.includes('scanMultipleCanvas(canvas,{fine:true'));
 assert.ok(s.includes('for(const {result:found} of codes)'));
 assert.ok(s.includes('zoomActions.hidden=false'));
 assert.ok(s.includes('zoom.hardware=false'));
 assert.ok(s.includes('video.dataset.digitalZoom'));
 assert.ok(s.includes('drawMultipleOutlines(outline,video'));
 assert.ok(s.includes('if(multiTimer!==null)'));
 const css=read('src/rivo-code-ultrascan.css');
 assert.ok(css.includes('min(53dvh,490px)'));
 assert.ok(css.includes('rivo-code-target-guide'));
});
test('file success notifies via native Android Toast, not a wide in-app banner',()=>{
 const main=read('src/main.js'),java=read('native/android/RivoDocumentsPlugin.java');
 assert.ok(main.includes("RivoDocuments.showSaveToast({message})"));
 assert.ok(main.includes("saveToast(shortSavedLabel())"));
 assert.ok(java.includes('Toast.LENGTH_SHORT'));
 assert.ok(java.includes('public void showSaveToast(PluginCall call)'));
 assert.ok(read('src/rivo-save-toast.css').includes('max-width:min(84vw,320px)'));
});
