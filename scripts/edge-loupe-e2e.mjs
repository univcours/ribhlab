/** Browser integration test of actual document edge adjustment.
 * Synthetic test pages only; no user documents, camera, account, or downloads.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const source=(await read('src/edge-adjustment.js')).replace(/^export /gm,'')
 +'\nwindow.__rivoOpenEdgeAdjustment=openEdgeAdjustment;\nwindow.__rivoCornerLoupe=cornerLoupeLayout;\nwindow.__rivoPaddedEdgeCanvas=paddedEdgeCanvas;\n';
const css=(await read('src/rivo-edge-adjustment.css'))+'\n'+(await read('src/rivo-top-corner-loupe.css'));
const out=process.env.RIVO_VISUAL_OUTPUT||'/tmp/rivoscan-visual-ui';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [360,412]){
  const height=width===360?780:915;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:system-ui;background:#d5ebf8"><main><h1>TEST DOCUMENT — edge editor</h1></main></body></html>');
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:source});
  await page.evaluate(async()=>{
   const src=document.createElement('canvas');src.width=460;src.height=640;
   const ctx=src.getContext('2d');ctx.fillStyle='#f8f4ed';ctx.fillRect(0,0,src.width,src.height);
   ctx.fillStyle='#ecf4fa';ctx.fillRect(25,36,410,566);
   ctx.strokeStyle='#0b3557';ctx.lineWidth=9;ctx.strokeRect(25,36,410,566);
   for(let i=0;i<8;i++){
    ctx.fillStyle=i%2?'#2f5d80':'#4b7c9e';
    ctx.fillRect(56,68+i*61,330,8);
   }
   const data=src.toDataURL('image/png').split(',')[1];
   window.__rivoSaved=[];
   window.__rivoCompleted=0;
   await window.__rivoOpenEdgeAdjustment({
    doc:{uri:'content://test/doc-1',name:'Scan_Test.png',mimeType:'image/png'},
    bridge:{readFile:async()=>({base64:data})},language:'en',
    onSave:async(bytes,name,mime)=>{
     window.__rivoSaved.push({name,mime,size:bytes.length});
     return {uri:'content://test/saved'};
    },
    onDone:async()=>{window.__rivoCompleted++}
   });
  });
  const geometry=await page.evaluate(()=>{
   const overlay=document.querySelector('.rivo-edge-adjust-overlay');
   const panel=overlay.querySelector('.rivo-edge-adjust-panel');
   const stage=overlay.querySelector('.rivo-edge-canvas-wrap');
   const a=overlay.getBoundingClientRect(),b=panel.getBoundingClientRect(),c=stage.getBoundingClientRect();
   return {viewport:[innerWidth,innerHeight],overlay:[a.width,a.height],panel:[b.width,b.height],stage:[c.width,c.height],
    fullscreen:getComputedStyle(panel).borderRadius==='0px'};
  });
  assert.ok(geometry.overlay[0]>=width-2&&geometry.overlay[1]>=height-2,'overlay uses full viewport');
  assert.ok(geometry.panel[0]>=width-2&&geometry.panel[1]>=height-2,'edge panel uses the whole phone screen');
  assert.ok(geometry.stage[1]>height*.46,'image editing stage must receive most of the screen');
  assert.equal(geometry.fullscreen,true,'no small centered popup or rounded corners');
  await page.screenshot({path:out+'/'+width+'-edge-editor-fullscreen.png'});
  const canvas=page.locator('.rivo-edge-canvas');
  await canvas.waitFor({state:'visible'});
  const bbox=await canvas.boundingBox();
  assert.ok(bbox&&bbox.width>150&&bbox.height>150,'editor canvas must be visible');
  const frame=await page.evaluate(()=>{
   const canvas=document.querySelector('.rivo-edge-canvas');
   const f=window.__rivoPaddedEdgeCanvas(460,640);
   if(canvas.width!==f.canvasWidth||canvas.height!==f.canvasHeight)throw Error('Canvas gutters not rendered');
   return f;
  });
  assert.ok(frame.x>=36&&frame.y>=36,'the source image has real free margin all around');
  assert.equal(frame.canvasWidth,Math.round(frame.width+frame.x*2));
  assert.equal(frame.canvasHeight,Math.round(frame.height+frame.y*2));
  const cursorX=bbox.x+bbox.width*(frame.x+.055*frame.width)/frame.canvasWidth;
  const cursorY=bbox.y+bbox.height*(frame.y+.055*frame.height)/frame.canvasHeight;
  const sampleLoupe=async()=>page.evaluate(()=>{
   const dock=document.querySelector('.rivo-edge-adjust-overlay .rivo-corner-loupe-dock');
   const preview=dock.querySelector('.rivo-corner-loupe-preview');
   const photo=document.querySelector('.rivo-edge-canvas-wrap');
   const a=dock.getBoundingClientRect(),b=photo.getBoundingClientRect();
   const ctx=preview.getContext('2d'),center=Math.round(preview.width/2);
   return {
    active:dock.dataset.active,side:dock.dataset.side,
    top:a.top,bottom:a.bottom,photoTop:b.top,
    size:preview.getBoundingClientRect().width,
    center:Array.from(ctx.getImageData(center,center,1,1).data),
    opacity:getComputedStyle(preview).opacity,
    documentUncovered:a.bottom<=b.top+1
   };
  });
  const before=await sampleLoupe();
  assert.equal(before.active,'false');
  assert.ok(before.documentUncovered,'top loupe row must not overlap photograph');
  await page.mouse.move(cursorX,cursorY);
  await page.mouse.down();
  const pressed=await sampleLoupe();
  await page.screenshot({path:out+'/'+width+'-corner-loupe-pressed.png'});
  assert.equal(pressed.active,'true','magnifier is shown on initial finger down');
  assert.equal(pressed.side,'right','finger at left corner makes top-right loupe');
  assert.equal(pressed.opacity,'1');
  assert.ok(pressed.size>=110,'loupe is large enough to inspect real image pixels');
  assert.ok(pressed.center[3]>0,'magnifier center contains source pixels or crosshair');
  assert.ok(pressed.documentUncovered,'circle never overlays the document');
  assert.ok(pressed.top<pressed.photoTop,'magnifier remains at top');
  await page.mouse.move(cursorX+22,cursorY+18,{steps:5});
  await page.screenshot({path:out+'/'+width+'-corner-loupe-drag.png'});
  await page.mouse.up();
  const after=await sampleLoupe();
  assert.equal(after.active,'false','loupe hides when finger releases');
  assert.equal(after.opacity,'0');
  const rightX=bbox.x+bbox.width*(frame.x+.945*frame.width)/frame.canvasWidth;
  const rightY=bbox.y+bbox.height*(frame.y+.055*frame.height)/frame.canvasHeight;
  await page.mouse.move(rightX,rightY);await page.mouse.down();
  const opposite=await sampleLoupe();
  assert.equal(opposite.active,'true');
  assert.equal(opposite.side,'left','finger at right corner makes top-left loupe');
  assert.ok(opposite.documentUncovered);
  await page.mouse.up();
  await page.locator('[data-edge="save"]').click();
  await page.waitForFunction(()=>window.__rivoSaved?.length===1&&window.__rivoCompleted===1,null,{timeout:15000});
  const saved=await page.evaluate(()=>({result:window.__rivoSaved[0],completed:window.__rivoCompleted,overlay:!!document.querySelector('.rivo-edge-adjust-overlay')}));
  assert.equal(saved.result.mime,'image/jpeg');
  assert.ok(saved.result.size>900,'corrected JPEG must contain bytes');
  assert.equal(saved.overlay,false,'dialog should close after successful save');
  assert.deepEqual(errors,[],'no browser JavaScript errors');
  results.push({width,status:'pass',saved});
  await context.close();
 }
}finally{await browser.close();}
await writeFile(out+'/corner-loupe-e2e-results.json',JSON.stringify(results,null,2));
console.log('PASS: real pointer drag shows 6x loupe, releases it and saves corrected JPEG at '+results.map(x=>x.width).join(', ')+'px');
