import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paddedEdgeCanvas,paddedEdgePoint,cornerLoupeLayout,perspectiveCropImageData} from '../src/edge-adjustment.js';

test('both editors get actual symmetric outer margins while keeping document centered',()=>{
 for(const [width,height] of [[460,640],[640,460],[1200,1800],[2400,900]]){
  const f=paddedEdgeCanvas(width,height);
  assert.ok(f.x>=36&&f.y>=36,'space for finger beyond each paper edge');
  assert.equal(f.canvasWidth-f.width,2*f.x);
  assert.equal(f.canvasHeight-f.height,2*f.y);
  assert.ok(f.width+2*f.x>width&&f.height+2*f.y>height);
  assert.deepEqual(paddedEdgePoint(f,[0,0]),[f.x,f.y]);
  assert.deepEqual(paddedEdgePoint(f,[1,1]),[f.x+width,f.y+height]);
  const mid=paddedEdgePoint(f,[.5,.5]);
  assert.equal(mid[0],f.canvasWidth/2);
  assert.equal(mid[1],f.canvasHeight/2);
  const side=cornerLoupeLayout(f.canvasWidth,f.canvasHeight,[mid[0]/f.canvasWidth,mid[1]/f.canvasHeight]);
  assert.equal(side.zoom,6);
  assert.ok(side.centerX-side.radius>=0&&side.centerX+side.radius<=f.canvasWidth);
 }
});
test('edge crop samples document image only; the padded editor background never reaches exported PDF/JPEG',()=>{
 const w=160,h=220,rgba=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){rgba[i*4]=242;rgba[i*4+1]=235;rgba[i*4+2]=222;rgba[i*4+3]=255;}
 const frame=paddedEdgeCanvas(w,h);
 const points=[[0,0],[1,0],[1,1],[0,1]];
 assert.deepEqual(paddedEdgePoint(frame,[0,0]),[frame.x,frame.y]);
 const output=perspectiveCropImageData({width:w,height:h,data:rgba},points);
 assert.ok(output.width>=120&&output.height>=120);
 const first=Array.from(output.data.slice(0,4));
 assert.equal(first[3],255);
 assert.ok(first[0]>230&&first[1]>220&&first[2]>210,'no dark padded background is exported');
});
test('full-screen editors use the same padded image-coordinate mapping',()=>{
 const saved=readFileSync(new URL('../src/edge-adjustment.js',import.meta.url),'utf8');
 const fresh=readFileSync(new URL('../src/perfectscan-capture-review.js',import.meta.url),'utf8');
 const source=readFileSync(new URL('../src/perfect-scan-ui.js',import.meta.url),'utf8');
 const edgeCSS=readFileSync(new URL('../src/rivo-edge-adjustment.css',import.meta.url),'utf8');
 const perfectCSS=readFileSync(new URL('../src/perfectscan-capture-review.css',import.meta.url),'utf8');
 for(const code of [saved,fresh]){
  assert.match(code,/paddedEdgeCanvas\(/);
  assert.match(code,/paddedEdgePoint\(frame,/);
  assert.match(code,/\(x-frame.x\)\/frame.width/);
  assert.match(code,/\(y-frame.y\)\/frame.height/);
 }
 assert.match(edgeCSS,/width:100%;height:100%/);
 assert.match(perfectCSS,/width:100%;height:100%/);
 const block=source.slice(source.indexOf(' async function writeResult(){'),source.indexOf(" root.addEventListener('click',e=>{"));
 assert.equal((block.match(/await onSave\(/g)||[]).length,1);
 assert.ok(block.includes("'.pdf','application/pdf'"),'only final PDF is written');
});
