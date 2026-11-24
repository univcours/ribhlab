// RivoScan 0.45.95: regression for a SINGLE centrally located real camera action.
// Browser tests validate layout only; never pretend that an AdMob impression was served.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.RIVO_URL||'http://127.0.0.1:4174/';
const out=process.env.RIVO_QA_DIR||'/tmp/rivoscan-04591-camera-qa';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report=[];
try{
 for(const width of [320,360,393,480,768]){
  const context=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.95'));
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const camera=page.locator('#app nav.mobilebar button.rivo-nav-scan[data-live-camera]');
  await camera.waitFor();
  assert.ok(await camera.isVisible());
  assert.equal(await camera.locator('.rivo-material-symbol[data-material-symbol="photo_camera"]').count(),1);
  assert.equal(await page.locator('#app .rivo-camera-fab').count(),0,'No duplicate camera on any viewport');
  if(width===393)await page.screenshot({path:out+'/393x852-single-camera-SAMPLE.png'});
  await page.locator('[data-open-library]:visible').first().click();
  assert.equal(await page.locator('#app .rivo-camera-fab').count(),0);
  await page.locator('[data-tab="tools"]:visible').first().click();
  assert.equal(await page.locator('#app .rivo-camera-fab').count(),0);
  assert.equal(await camera.locator('[data-material-symbol="photo_camera"]').count(),1);
  report.push({width,cameraControls:1,cameraIcon:'photo_camera',duplicate:false,adDelivery:'NOT TESTED ON BROWSER'});
  await context.close();
 }
 writeFileSync(out+'/single-camera-04591-results.json',JSON.stringify(report,null,2)+'\n');
 console.log('RivoScan 0.45.95 one-camera UI check PASS:',JSON.stringify(report));
}finally{await browser.close()}
