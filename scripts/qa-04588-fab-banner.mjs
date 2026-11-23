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
  await context.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.90'));
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
  // On a browser, AdMob is NOT initialized; the monetization lifecycle
  // correctly removes synthetic 'rivo-has-ad-banner' classes. Never spoof a
  // loaded ad. Validate native 320x50 rectangle + state decision against the
  // actual visible FAB geometry instead; device-banner delivery remains unverified.
  const bannerPolicy=await page.evaluate(async()=>{
    const {nativeBannerBounds,cameraFabDecision}=await import('/src/floating-camera-controller.js');
    const f=document.querySelector('#app .rivo-camera-fab').getBoundingClientRect();
    const margin=innerHeight-(f.top+40+50);
    const ad=nativeBannerBounds({viewportWidth:document.documentElement.clientWidth,
      viewportHeight:innerHeight,margin});
    const overlaps=!!ad&&f.left<ad.right&&f.right>ad.left&&f.top<ad.bottom&&f.bottom>ad.top;
    const choice=cameraFabDecision({route:'home',bannerCollision:overlaps});
    return {overlaps,visibility:choice.visible,margin,ad,position:{left:f.left,right:f.right,top:f.top,bottom:f.bottom}};
  });
  // On wide screens the FAB may already be outside the centred native 320dp
  // banner. Never suppress a safe action merely to make a test pass.
  assert.equal(bannerPolicy.visibility,!bannerPolicy.overlaps,
    'FAB visibility must be the exact inverse of overlap with native banner at '+width+'px');
  report.push({width,idle:true,idModalHidden:true,restored:true,
    nativeBannerCollisionPolicy:bannerPolicy.overlaps?'SUPPRESS_ON_COLLISION':'KEEP_WHEN_SEPARATE',
    adDelivery:'NOT TESTED ON BROWSER'});

  await context.close();
 }
 writeFileSync(out+'/fab-banner-04588-qa-results.json',JSON.stringify(report,null,2)+'\n');
 console.log('FAB ID modal + native banner GEOMETRY tests PASS:',JSON.stringify(report));
}finally{await browser.close()}
