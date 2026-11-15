/** Browser integration test of actual document edge adjustment.
 * Synthetic test pages only; no user documents, camera, account, or downloads.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const source=(await read('src/edge-adjustment.js')).replace(/^export /gm,'')
 +'\nwindow.__rivoOpenEdgeAdjustment=openEdgeAdjustment;\nwindow.__rivoCornerLoupe=cornerLoupeLayout;\n';
const css=await read('src/rivo-edge-adjustment.css');
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
  const canvas=page.locator('.rivo-edge-canvas');
  await canvas.waitFor({state:'visible'});
  const bbox=await canvas.boundingBox();
  assert.ok(bbox&&bbox.width>150&&bbox.height>150,'editor canvas must be visible');
  const cursorX=bbox.x+bbox.width*.055,cursorY=bbox.y+bbox.height*.055;
  const pixelSample=async()=>page.evaluate(()=>{
   const c=document.querySelector('.rivo-edge-canvas');
   const {centerX,centerY,radius}=window.__rivoCornerLoupe(c.width,c.height,[.055,.055]);
   const ctx=c.getContext('2d');
   return Array.from(ctx.getImageData(Math.round(centerX+radius+3),Math.round(centerY),1,1).data);
  });
  const before=await pixelSample();
  await page.mouse.move(cursorX,cursorY);
  await page.mouse.down();
  const pressed=await pixelSample();
  await page.screenshot({path:out+'/'+width+'-corner-loupe-pressed.png'});
  assert.notDeepEqual(pressed,before,'magnifier border must render on finger down');
  assert.ok(pressed[1]>120&&pressed[2]>110,'magnifier border must be teal and clearly visible');
  await page.mouse.move(cursorX+22,cursorY+18,{steps:5});
  await page.screenshot({path:out+'/'+width+'-corner-loupe-drag.png'});
  await page.mouse.up();
  const after=await pixelSample();
  assert.notDeepEqual(pressed,after,'magnifier must disappear when finger lifts');
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
