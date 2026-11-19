import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeScannerPaperRGBA} from '../src/scanner-paper.js';
const luminance=(rgb,index)=>.2126*rgb[index]+.7152*rgb[index+1]+.0722*rgb[index+2];
test('Scanner Pro reduces paper shadows without destroying ink and blue stamps',()=>{
 const w=320,h=240,a=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4;let val=Math.round(153+74*x/(w-1));
  if(y>=64&&y<=69&&x>=15&&x<275)val=28;
  a[p]=a[p+1]=a[p+2]=val;a[p+3]=255;
 }
 for(let y=140;y<156;y++)for(let x=80;x<106;x++){const p=(y*w+x)*4;a[p]=25;a[p+1]=55;a[p+2]=195;}
 const original=a.slice(),b=normalizeScannerPaperRGBA(a,w,h);
 assert.deepEqual(a,original,'source is immutable');
 const left=luminance(b,(22*w+24)*4),right=luminance(b,(22*w+289)*4);
 assert.ok(Math.abs(left-right)<23,'shading corrected');
 assert.ok(left>209&&right>209,'paper bright');
 assert.ok(luminance(b,(67*w+150)*4)<78,'dark strokes remain');
 const p=(146*w+90)*4;assert.ok(b[p+2]>b[p+1]*1.65,'blue seal remains blue');
 assert.equal(b[p+3],255,'alpha retained');
});
test('Rejects invalid image geometry',()=>assert.throws(()=>normalizeScannerPaperRGBA([],0,1)));
test('Android CameraX selectable Pro scan mode and default quality use the same key',()=>{
 const native=readFileSync(new URL('../native/android/RivoDocumentEnhancer.java',import.meta.url),'utf8');
 const camera=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
 const prefs=readFileSync(new URL('../src/scanner-settings.js',import.meta.url),'utf8');
 assert.ok(native.includes('PRO_SCAN="proscan"'));
 assert.ok(native.includes('PRO_SCAN.equals(mode)?1.65'));
 assert.ok(camera.includes('RivoDocumentEnhancer.PRO_SCAN'));
 assert.ok(prefs.includes("enhancement:'proscan'"));
});
