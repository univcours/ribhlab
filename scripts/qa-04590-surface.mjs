// Android WebView geometry in Playwright browser. This is NOT a native AdMob
// impression nor physical camera evidence. Screenshots are SAMPLE.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.RIVO_URL||'http://127.0.0.1:4174/';
const out=process.env.RIVO_QA_DIR||'/tmp/rivoscan-04590-ui';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [320,360,393,480,768]){
  const context=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.91'));
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const camera=page.locator('#app nav.mobilebar button.rivo-nav-scan[data-live-camera]');
  await camera.waitFor();
  assert.ok(await camera.isVisible(),'Bottom navigation camera must be visible');
  assert.equal(await camera.locator('[data-material-symbol="photo_camera"]').count(),1,
   'Primary Scan action must have a real Material Symbols Rounded camera icon');
  assert.equal(await page.locator('#app .rivo-camera-fab').count(),0,'Floating duplicate must be absent');
  // Only simulate native screen geometry; never simulate actual Google ads.
  const geometry=await page.evaluate(async()=>{
   const {calculateAdLayout}=await import('/src/rivo-native-ad-geometry.js');
   document.body.classList.add('rivo-native-android');
   const nav=document.querySelector('#app nav.mobilebar.rivo-nav-five').getBoundingClientRect();
   const head=document.querySelector('#app .topbar').getBoundingClientRect();
   const p=calculateAdLayout({viewportWidth:document.documentElement.clientWidth,
      viewportHeight:window.innerHeight,navTop:nav.top,navBottom:nav.bottom,headerBottom:head.bottom});
   if(!p.valid)return {valid:false,reason:p.reason};
   const root=document.documentElement;
   root.style.setProperty('--rivo-content-bottom',p.contentBottom+'px');
   root.style.setProperty('--rivo-content-top',p.contentTop+'px');
   root.style.setProperty('--rivo-banner-bottom',p.margin+'px');
   document.body.classList.add('rivo-ad-reserved');
   const box=selector=>{
     const r=document.querySelector(selector).getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
   };
   return {valid:true,p,slot:box('#app .rivo-ad-banner-slot'),
      content:box('#app .content'),nav:box('#app nav.mobilebar')};
  });
  assert.ok(geometry.valid,JSON.stringify(geometry));
  const g=geometry;
  assert.ok(Math.abs(g.slot.top-g.p.bannerTop)<=2,JSON.stringify(g));
  assert.ok(g.slot.bottom<=g.nav.top-1,'Native banner lane must end before bottom nav');
  assert.ok(g.content.bottom<=g.slot.top-3,'Scroll viewport must end before reserved native banner lane');
  if(width===393)await page.screenshot({path:out+'/393x852-native-lane-SAMPLE-NO-GOOGLE-AD.png'});
  await page.evaluate(()=>{
   document.body.classList.remove('rivo-native-android','rivo-ad-reserved');
   for(const key of ['--rivo-content-bottom','--rivo-content-top','--rivo-banner-bottom'])
     document.documentElement.style.removeProperty(key);
  });
  // Independently navigate the actual app surfaces.
  await page.locator('[data-open-library]:visible').first().click();
  await page.locator('#library-list').waitFor();
  assert.equal(await page.locator('#app button.rivo-camera-fab').count(),0);
  if(width===393)await page.screenshot({path:out+'/393x852-documents-SAMPLE.png'});
  await page.locator('[data-tab="tools"]:visible').first().click();
  await page.locator('.rivo-tools-hub').waitFor();
  if(width===393)await page.screenshot({path:out+'/393x852-tools-SAMPLE.png'});
  // Formula OCR is opened from its real app module, with camera/OCR disabled.
  await page.evaluate(async()=>{
   document.body.classList.add('rivo-native-android');
   const {openFormulaReader}=await import('/src/formula-ocr.js');
   openFormulaReader({language:'en',capture:async()=>null,save:async()=>null});
  });
  const panel=page.locator('.rivo-code-overlay .rivo-code-dialog.rivo-shared-preview-dialog');
  await panel.waitFor();
  const bounds=await page.evaluate(()=>{
   const box=sel=>{
    const x=document.querySelector(sel).getBoundingClientRect();
    return {top:x.top,bottom:x.bottom,height:x.height,left:x.left,right:x.right};
   };
   return {head:box('.rivo-code-overlay .rivo-workspace-header'),
     dialog:box('.rivo-code-overlay .rivo-shared-preview-dialog'),
     preview:box('.rivo-code-overlay .rivo-shared-preview-dock'),
     footer:box('.rivo-code-overlay .rivo-workspace-bottom'),
     save:box('.rivo-code-overlay .rivo-workspace-bottom button'),
     nav:box('#app nav.mobilebar')};
  });
  assert.ok(bounds.head.top>=-1,'Formula title must not enter Android status bar');
  assert.ok(bounds.save.bottom<=852-2,'Formula Save must not enter Android navigation/system bar');
  assert.ok(bounds.save.top>=bounds.head.bottom,'Formula Save must follow title');
  assert.ok(bounds.preview.height<=190,'Empty Formula preview should collapse');
  assert.ok(bounds.footer.bottom>bounds.nav.top,'Formula modal must cover app nav, not be hidden behind it');
  assert.ok(await page.locator('.rivo-code-overlay .rivo-workspace-bottom button').isVisible());
  if(width===393)await page.screenshot({path:out+'/393x852-formula-empty-SAMPLE.png'});
  await page.evaluate(()=>document.querySelector('.rivo-code-overlay')?.remove());
  // All scanner overlays must preserve the one real camera button in the nav;
  // no second floating camera is allowed, even after opening an editor.
  for(const name of ['rivo-code-overlay','rivo-plate-overlay','rivo-id-overlay']){
   await page.evaluate(name=>{
     const e=document.createElement('div');e.className=name;e.id='qa-overlay';
     e.style.cssText='position:fixed;inset:0;background:#fff;z-index:1000';
     document.body.append(e);
   },name);
   assert.equal(await page.locator('#app button.rivo-camera-fab').count(),0);
   assert.equal(await page.locator('#app nav.mobilebar button.rivo-nav-scan[data-live-camera]').count(),1);
   await page.evaluate(()=>document.querySelector('#qa-overlay')?.remove());
  }
  results.push({width,primaryCamera:'photo_camera',duplicateFloatingCamera:false,nativeBannerLane:'GEOMETRY ONLY',
    home:true,documents:true,tools:true,formulaSave:true,
    qrBarcodePlate:'MODAL VISIBILITY ONLY',nativeAdImpression:'NOT TESTED'});
  await context.close();
 }
 writeFileSync(out+'/rivo-04590-layout-qa.json',JSON.stringify(results,null,2)+'\n');
 console.log('RivoScan 0.45.91 SAMPLE native lane/formula/FAB responsive QA:',JSON.stringify(results));
}finally{await browser.close()}
