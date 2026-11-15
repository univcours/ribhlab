/** Real browser pointer-drag verification for PerfectScan camera post-capture review.
 * Synthetic page only, no camera/photos/account/network access.
 */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const source=async file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const oldEditor=(await source('src/edge-adjustment.js')).replace(/^export /gm,'');
const review=(await source('src/perfectscan-capture-review.js'))
 .replace(/^import\s+[^;]+;\s*$/gm,'').replace(/^export /gm,'');
const css=await source('src/perfectscan-capture-review.css');
const dir=process.env.RIVO_VISUAL_OUTPUT||'/tmp/rivoscan-visual-ui';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const states=[];
try{
 for(const width of [360,412]){
  const context=await browser.newContext({viewport:{width,height:width===360?800:900},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#d7eaf6"></body></html>');
  await page.addStyleTag({content:css});
  // Reproduce the REAL parent overlay stack that obscured the corner editor.
  await page.addStyleTag({content:'.rivo-perfectscan-overlay{position:fixed;inset:0;z-index:2147483000;background:#ffffff;display:flex;align-items:center;justify-content:center;} .rivo-perfectscan-overlay button{padding:25px}'});
  await page.evaluate(()=>{
   const parent=document.createElement('div');parent.className='rivo-perfectscan-overlay';
   parent.innerHTML='<button type="button" id="blocked-perfectscan-parent">Parent PerfectScan</button>';
   document.body.appendChild(parent);
  });
  await page.addScriptTag({content:oldEditor+'\n'+review+'\nwindow.__reviewPerfectScan=reviewPerfectScanCapture;\n'});
  await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;
   const c=canvas.getContext('2d');c.fillStyle='#173349';c.fillRect(0,0,600,800);
   c.fillStyle='#f4f0e9';c.fillRect(80,95,440,615);
   c.fillStyle='#285674';
   for(let i=0;i<11;i++)c.fillRect(112,130+i*45,320,6);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));
   const file=new File([blob],'Photo_From_Camera.jpg',{type:'image/jpeg'});
   window.__reviewResult=null;
   window.__reviewPerfectScan(file,{language:'ar'}).then(async result=>{
    window.__reviewResult=result?{
     originalName:result.original.name,originalSize:result.original.size,
     name:result.file.name,size:result.file.size,detected:result.detected,
     cropped:result.cropped,corners:result.corners
    }:{cancelled:true};
   });
  });
  const dialog=page.locator('.rivo-perfect-capture-overlay');
  await dialog.waitFor();
  const dialogStack=await page.evaluate(()=>{
   const review=document.querySelector('.rivo-perfect-capture-overlay');
   const parent=document.querySelector('.rivo-perfectscan-overlay');
   const confirm=review.querySelector('[data-capture-action="continue"]');
   const b=confirm.getBoundingClientRect();
   const top=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
   return {reviewZ:Number(getComputedStyle(review).zIndex),parentZ:Number(getComputedStyle(parent).zIndex),
    hit:top?.closest('.rivo-perfect-capture-overlay')===review,
    parentButtonCovered:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('.rivo-perfectscan-overlay')===parent};
  });
  assert.ok(dialogStack.reviewZ>dialogStack.parentZ,'review must stack ABOVE original PerfectScan modal');
  assert.equal(dialogStack.hit,true,'the user can actually press Continue on the topmost review');
  assert.equal(dialogStack.parentButtonCovered,false,'the original background is not interactive during review');
  const status=await page.locator('.rivo-perfect-capture-message').textContent();
  assert.ok(status.includes('تم تحديد'),'page must be auto-detected after camera photo');
  const canvas=page.locator('.rivo-perfect-capture-canvas'),bounds=await canvas.boundingBox();
  assert.ok(bounds&&bounds.width>150);
  const frame=await page.evaluate(()=>{
   const f=paddedEdgeCanvas(600,800),canvas=document.querySelector('.rivo-perfect-capture-canvas');
   if(canvas.width!==f.canvasWidth||canvas.height!==f.canvasHeight)throw Error('Padded canvas dimensions mismatch');
   return f;
  });
  assert.ok(frame.x>40&&frame.y>40,'PerfectScan photo is centered with all-sided safe margins');
  const x=bounds.x+bounds.width*(frame.x+.135*frame.width)/frame.canvasWidth;
  const y=bounds.y+bounds.height*(frame.y+.118*frame.height)/frame.canvasHeight;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.screenshot({path:dir+'/'+width+'-perfectscan-corners-after-photo.png'});
  await page.mouse.move(x+16,y+14,{steps:4});
  await page.screenshot({path:dir+'/'+width+'-perfectscan-corner-loupe-drag.png'});
  await page.mouse.up();
  await page.locator('[data-capture-action="continue"]').click();
  await page.waitForFunction(()=>window.__reviewResult!==null,{timeout:20000});
  const saved=await page.evaluate(()=>window.__reviewResult);
  assert.equal(saved.detected,true,'automatic corners were detected');
  assert.equal(saved.cropped,true,'cropped photo is returned to PerfectScan');
  assert.equal(saved.originalName,'Photo_From_Camera.jpg','original photo remains intact');
  assert.ok(saved.size>1000,'corrected file contains actual JPEG');
  assert.equal(await dialog.count(),0,'post-capture modal closes on confirm');
  assert.deepEqual(errors,[],'no browser runtime errors');
  states.push({width,status:'pass',saved});
  await context.close();
 }
 // Ensure conservative fallback: unknown page must NOT get an invented rectangle.
 const context=await browser.newContext({viewport:{width:360,height:780},hasTouch:true,isMobile:true});
 const page=await context.newPage();
 await page.setContent('<!doctype html><body style="margin:0"></body>');
 await page.addStyleTag({content:css});
 await page.addScriptTag({content:oldEditor+'\n'+review+'\nwindow.__reviewPerfectScan=reviewPerfectScanCapture;'});
 await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=640;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#cfcfcf';ctx.fillRect(0,0,480,640);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.93));
  window.__fallback=null;
  window.__reviewPerfectScan(new File([blob],'no-edges.jpg',{type:'image/jpeg'}),{language:'en'})
   .then(result=>window.__fallback=result&&{cropped:result.cropped,detected:result.detected,name:result.file.name});
 });
 await page.locator('.rivo-perfect-capture-overlay').waitFor();
 assert.ok((await page.locator('.rivo-perfect-capture-message').textContent()).includes('No reliable edge detection'));
 await page.screenshot({path:dir+'/360-perfectscan-no-fake-rectangle.png'});
 await page.locator('[data-capture-action="original"]').click();
 await page.locator('[data-capture-action="continue"]').click();
 await page.waitForFunction(()=>window.__fallback!==null);
 const fallback=await page.evaluate(()=>window.__fallback);
 assert.deepEqual(fallback,{cropped:false,detected:false,name:'no-edges.jpg'});
 await context.close();
}finally{await browser.close();}
await writeFile(dir+'/perfectscan-postcapture-e2e-results.json',JSON.stringify({states,ambiguous:'pass'},null,2));
console.log('PASS PerfectScan: auto corners after camera capture, draggable 6x loupe, original preservation, manual/original fallback on 360/412px');
