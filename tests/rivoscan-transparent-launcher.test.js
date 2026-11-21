import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import pngjs from 'pngjs';
import '../scripts/create-turquoise-icon.mjs';
const {PNG}=pngjs;
const load=p=>readFileSync(new URL('../'+p,import.meta.url));
test('original scanner artwork has transparent outer launcher background, not white',()=>{
 const original=load('assets/branding/rivoscan-icon-source.png');
 assert.equal(createHash('sha256').update(original).digest('hex'),'e2e1626a748593fd71e39c00bb3826a6de16b365ecfc344e8807549ab1b4dc8f');
 for(const file of ['public/rivoscan-icon.png','public/rivoscan-store-icon.png','public/rivoscan-adaptive-foreground.png']){
  const im=PNG.sync.read(load(file));
  assert.equal(im.width,512);assert.equal(im.height,512);
  for(const [x,y] of [[0,0],[511,0],[0,511],[511,511]]){
   assert.equal(im.data[(y*512+x)*4+3],0,file+' should have alpha-transparent outer corners');
  }
  assert.equal(im.data[(256*512+256)*4+3],255,file+' must keep the original center artwork');
  assert.ok(im.data.some((v,i)=>i%4===3 && v===0),file+' should contain real alpha pixels');
 }
});
test('Android adaptive launcher is blue, with original foreground and mask assets',()=>{
 const ps=load('apply-rivoscan-branding.ps1').toString('utf8');
 assert.match(ps,/<gradient android:startColor="#0739BE" android:endColor="#04B9EB" android:angle="0"\/>/);
 assert.doesNotMatch(ps,/<solid android:color="#FFFFFF"\/>/);
 assert.match(ps,/<foreground android:drawable="@drawable\/rivoscan_launcher_adaptive"\/>/);
 assert.match(ps,/ic_launcher_round\.xml/);
});
