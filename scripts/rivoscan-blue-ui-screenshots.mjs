// Blue palette regression screenshots after restoring official RivoScan blue/azure brand.
// Real Chromium screenshots from the current RivoScan editor modules, not mockups.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const output='/tmp/rivoscan-prod-blue-screenshots';
const base=process.env.RIVO_URL||'http://127.0.0.1:5173';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
const screenshot=async(page,name)=>{
 await page.screenshot({path:output+'/'+name+'.png',fullPage:false,animations:'disabled'});
 results.push(name+'.png');
};
const verify=async(page,preview,drawer,dialog)=>{
 const metrics=await page.evaluate(({preview,drawer,dialog})=>{
  const pic=document.querySelector(preview),panel=document.querySelector(drawer),win=document.querySelector(dialog);
  if(!pic||!panel||!win)throw Error('Editing workspace missing DOM element');
  const rect=pic.getBoundingClientRect(),css=getComputedStyle(panel),outer=getComputedStyle(win);
  return {height:rect.height,width:rect.width,drawerVisible:css.display!=='none',
    scroll:css.overflowY,outerScroll:outer.overflowY};
 },{preview,drawer,dialog});
 assert.ok(metrics.height>=130&&metrics.width>=100,
   'Document preview must be visible during settings changes: '+JSON.stringify(metrics));
 assert.equal(metrics.drawerVisible,true,'Contextual settings must be visible');
 assert.equal(metrics.scroll,'auto','Only contextual settings should scroll');
 assert.equal(metrics.outerScroll,'hidden','Entire dialog must not scroll away');
 return metrics;
};
try{
 const ctx=await browser.newContext({viewport:{width:393,height:873},deviceScaleFactor:1,
  isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 page.on('pageerror',err=>{console.error('Browser error:',err.message)});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForTimeout(1300);
 const dataUrl=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=850;c.height=600;
  const x=c.getContext('2d');
  x.fillStyle='#576e6e';x.fillRect(0,0,850,600);
  x.fillStyle='#f7f0d8';x.fillRect(38,36,376,525);
  x.fillStyle='#fbf6e3';x.fillRect(435,36,376,525);
  x.fillStyle='#8b8071';x.fillRect(416,36,17,525);
  x.fillStyle='#293b42';x.font='bold 29px Arial';
  x.fillText('RivoScan sample',70,100);x.fillText('Book Scan demo',470,100);
  x.font='19px Arial';
  for(let j=0;j<15;j++){
   x.fillText('A line of sample printed text',65,147+j*25);
   x.fillText('Preview stays on screen',456,147+j*25);
  }
  x.fillStyle='#627879';x.font='bold 19px Arial';
  x.fillText('TEST IMAGE - NOT A REAL BOOK',69,530);
  return c.toDataURL('image/png');
 });
 const sample=Buffer.from(dataUrl.split(',')[1],'base64');
 const input={name:'RivoScan_demo.png',mimeType:'image/png',buffer:sample};

 // Book Scan: image fixed, split task shows only the divider and spine detection.
 await page.evaluate(async()=>{
  const {openBookSplitter}=await import('/src/book-split.js');
  openBookSplitter({language:'en',save:async()=>{}});
 });
 await page.locator('.rivo-id-dialog input[type=file]').setInputFiles(input);
 await page.waitForFunction(()=>document.querySelector('.rivo-book-preview-dock canvas')?.width>0,
  {timeout:25000});
 await page.locator('.rivo-book-dialog .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-book-dialog [data-book-task="split"]').click();
 await verify(page,'.rivo-book-preview-dock canvas','.rivo-book-dialog .rivo-workspace-settings','.rivo-book-dialog');
 assert.equal(await page.locator('.rivo-book-dialog [data-book-panel="flatten"]:visible').count(),0);
 await screenshot(page,'01-book-scan-split-settings');
 await page.locator('.rivo-book-dialog [data-book-task="flatten"]').click();
 await verify(page,'.rivo-book-preview-dock canvas','.rivo-book-dialog .rivo-workspace-settings','.rivo-book-dialog');
 await screenshot(page,'02-book-scan-flatten-settings');
 await page.locator('.rivo-book-dialog .rivo-workspace-settings-toggle').click();
 await screenshot(page,'03-book-scan-preview-only');
 await page.locator('.rivo-book-dialog .rivo-modal-dismiss').click();

 // PerfectScan: same source preview, correction controls appear only when requested.
 await page.evaluate(async()=>{
  const {openPerfectScan}=await import('/src/perfect-scan-ui.js');
  window.__rivoClosing=await openPerfectScan({getLanguage:()=> 'en',onSave:async()=>{}});
 });
 await page.locator('.rivo-perfect-file').setInputFiles(input);
 await page.waitForFunction(()=>document.querySelector('.rivo-perfectscan-preview canvas')?.width>0);
 await page.locator('.rivo-perfectscan-modal .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-perfectscan-modal [data-perfect-task="correction"]').click();
 await verify(page,'.rivo-perfectscan-preview canvas','.rivo-perfectscan-modal .rivo-workspace-settings','.rivo-perfectscan-modal');
 await screenshot(page,'04-perfectscan-correction-settings');
 await page.locator('.rivo-perfectscan-modal .rivo-workspace-settings-toggle').click();
 await screenshot(page,'05-perfectscan-preview-only');
 await page.locator('.rivo-perfectscan-modal [data-perfect="close"]').click();

 // Edit Scan: filters or numeric adjustments, never everything at the same time.
 await page.evaluate(async dataUrl=>{
  const {openScanEditor}=await import('/src/scan-editor.js');
  await openScanEditor({doc:{uri:'test',mimeType:'image/png',name:'RivoScan demo',size:500000},
   bridge:{readFile:async()=>({mimeType:'image/png',base64:dataUrl.split(',')[1]})},
   getLanguage:()=> 'en',onSave:async()=>{},onCrop:async()=>{},onRetake:async()=>{},
   onRefresh:async()=>{},notify:()=>{},preset:'enhance'});
 },dataUrl);
 await page.locator('.rivo-editor-window .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-editor-window [data-editor-task="filters"]').click();
 await verify(page,'.rivo-editor-picture canvas','.rivo-editor-window .rivo-workspace-settings','.rivo-editor-window');
 await screenshot(page,'06-edit-scan-filters-settings');
 await page.locator('.rivo-editor-window [data-editor-task="adjust"]').click();
 await verify(page,'.rivo-editor-picture canvas','.rivo-editor-window .rivo-workspace-settings','.rivo-editor-window');
 await screenshot(page,'07-edit-scan-adjust-settings');
 await page.locator('.rivo-editor-window .rivo-workspace-settings-toggle').click();
 await screenshot(page,'08-edit-scan-preview-only');

 // The other image-based tools follow exactly the same preview-first rule.
 await page.locator('.rivo-editor-window [data-edit="cancel"]').click();
 await page.evaluate(async()=>{
  const {openIDPhotoMaker}=await import('/src/id-photo-maker.js');
  openIDPhotoMaker({language:'en',save:async()=>{}});
 });
 await page.locator('.rivo-shared-preview-dialog input[type="file"]').setInputFiles(input);
 await page.waitForFunction(()=>document.querySelector('.rivo-shared-preview-dialog canvas')?.width>500);
 await page.locator('.rivo-shared-preview-dialog .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-shared-preview-dialog [data-preview-task="adjust"]').click();
 await verify(page,'.rivo-shared-preview-dock canvas','.rivo-shared-preview-dialog .rivo-workspace-settings','.rivo-shared-preview-dialog');
 await screenshot(page,'09-id-photo-size-crop-settings');
 await page.locator('.rivo-shared-preview-dialog [data-preview-task="background"]').click();
 await screenshot(page,'10-id-photo-background-settings');
 await page.locator('.rivo-shared-preview-dialog .rivo-modal-dismiss').click();

 await page.evaluate(async()=>{
  const {openCountCam}=await import('/src/count-cam.js');
  openCountCam({language:'en'});
 });
 await page.locator('.rivo-shared-preview-dialog input[type="file"]').setInputFiles(input);
 await page.waitForFunction(()=>document.querySelector('.rivo-shared-preview-dialog canvas')?.width>500);
 await page.locator('.rivo-shared-preview-dialog .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-shared-preview-dialog [data-preview-task="detect"]').click();
 await verify(page,'.rivo-shared-preview-dock canvas','.rivo-shared-preview-dialog .rivo-workspace-settings','.rivo-shared-preview-dialog');
 await screenshot(page,'11-countcam-detection-settings');
 await page.locator('.rivo-shared-preview-dialog .rivo-modal-dismiss').click();

 await page.evaluate(async()=>{
  const {openFormulaReader}=await import('/src/formula-ocr.js');
  openFormulaReader({language:'en',save:async()=>{}});
 });
 await page.locator('.rivo-shared-preview-dialog input[type="file"]').setInputFiles(input);
 await page.waitForFunction(()=>document.querySelector('.rivo-shared-preview-dialog canvas')?.width>500);
 await page.locator('.rivo-shared-preview-dialog .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-shared-preview-dialog [data-preview-task="result"]').click();
 await verify(page,'.rivo-shared-preview-dock canvas','.rivo-shared-preview-dialog .rivo-workspace-settings','.rivo-shared-preview-dialog');
 await screenshot(page,'12-formula-ocr-text-settings');
 await page.locator('.rivo-shared-preview-dialog .rivo-modal-dismiss').click();

 await page.evaluate(async()=>{
  const {openPhotoTranslation}=await import('/src/photo-translation.js');
  openPhotoTranslation({language:'en',save:async()=>{}});
 });
 await page.locator('.rivo-shared-preview-dialog input[type="file"]').setInputFiles(input);
 await page.waitForFunction(()=>document.querySelector('.rivo-shared-preview-dialog img')?.complete);
 await page.locator('.rivo-shared-preview-dialog .rivo-workspace-settings-toggle').click();
 await page.locator('.rivo-shared-preview-dialog [data-preview-task="translation"]').click();
 await verify(page,'.rivo-shared-preview-dock img','.rivo-shared-preview-dialog .rivo-workspace-settings','.rivo-shared-preview-dialog');
 await screenshot(page,'13-photo-translation-settings');
 await page.locator('.rivo-shared-preview-dialog .rivo-modal-dismiss').click();

 await writeFile(output+'/report.json',JSON.stringify({images:results,viewport:'393x873',
   type:'production RivoScan 0.45.41 blue editor modules rendered in Chromium with synthetic TEST photo'},null,2));
 console.log('Created actual RivoScan editor screenshots:',results);
 await ctx.close();
}finally{await browser.close()}
