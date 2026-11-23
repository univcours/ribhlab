// Browser geometry/interaction tests. SAMPLE UI only: not a native Google ad
// or a physical Android camera / app. No simulated ad impressions are counted.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.RIVO_URL||'http://127.0.0.1:4173/';
const out=process.env.RIVO_QA_DIR||'/tmp/rivoscan-04588-qa';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report=[];
try{
 for(const width of [320,360,393,480,768]){
  const context=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.88'));
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('button.rivo-camera-fab').waitFor();
  const fab=page.locator('button.rivo-camera-fab');
  await page.waitForFunction(()=>{const b=document.querySelector('#app .rivo-camera-fab');return b&&!b.hidden&&b.getClientRects().length>0;});
  assert.ok(await fab.isVisible(),width+'px FAB must show when Home is idle');
  if(width===393)await page.screenshot({path:out+'/393x852-fab-idle-SAMPLE.png',fullPage:true});
  // Book Scan / ID Photo overlay: must hide the button as soon as it opens.
  await page.evaluate(()=>{
   const overlay=document.createElement('div');
   overlay.id='qa-mocked-id-modal';overlay.className='rivo-id-overlay';
   overlay.style.cssText='position:fixed;inset:0;display:block;z-index:10000;background:#fff;';
   document.body.appendChild(overlay);
  });
  await page.waitForFunction(()=>document.querySelector('button.rivo-camera-fab')?.hidden===true);
  if(width===393)await page.screenshot({path:out+'/393x852-fab-hidden-id-modal-SAMPLE.png'});
  await page.evaluate(()=>document.querySelector('#qa-mocked-id-modal').remove());
  await page.waitForFunction(()=>document.querySelector('button.rivo-camera-fab')?.hidden===false);
  // A synthetic CSS rectangle stands for the *geometry* of the native banner.
  // It is not a fake ad, test inventory, or evidence that an AdMob ad was served.
  await page.evaluate(()=>{
   const fab=document.querySelector('#app .rivo-camera-fab').getBoundingClientRect();
   const margin=window.innerHeight-(fab.top+40+50);
   document.documentElement.style.setProperty('--rivo-banner-bottom',margin+'px');
   document.body.classList.add('rivo-has-ad-banner');
  });
  await page.waitForFunction(()=>document.querySelector('button.rivo-camera-fab')?.hidden===true);
  await page.evaluate(()=>{
   document.body.classList.remove('rivo-has-ad-banner');
   document.documentElement.style.removeProperty('--rivo-banner-bottom');
  });
  await page.waitForFunction(()=>document.querySelector('button.rivo-camera-fab')?.hidden===false);
  report.push({width,idle:true,idModalHidden:true,restored:true,nativeBannerCollisionHidden:true,adDelivery:'NOT TESTED'});
  await context.close();
 }
 writeFileSync(out+'/fab-banner-04588-qa-results.json',JSON.stringify(report,null,2)+'\n');
 console.log('FAB ID modal + native banner GEOMETRY tests PASS:',JSON.stringify(report));
}finally{await browser.close()}
