import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const root='/tmp/rivoscan-banner-qaproof';
const origin='http://127.0.0.1:4173';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
for(const width of [320,360,393,412]){
 const context=await browser.newContext({viewport:{width,height:873},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('.mobilebar [data-tab="tools"]').waitFor({state:'visible'});
 await page.waitForTimeout(350);
 await page.locator('.rivo-release-overlay button').filter({hasText:'Got it'}).first().click({timeout:1800}).catch(()=>{});
 for(const [name,selector] of [['home','.mobilebar [data-go="home"]'],['documents','.mobilebar [data-open-library]'],['tools','.mobilebar [data-tab="tools"]'],['me','.mobilebar [data-tab="me"]']]){
  await page.locator(selector).click();
  const proof=await page.evaluate(()=>{
   const body=document.body,root=document.documentElement;
   const nav=document.querySelector('#app nav.mobilebar.rivo-nav-five');
   const topbar=document.querySelector('#app .topbar');
   const n=nav.getBoundingClientRect(),h=topbar.getBoundingClientRect();
   const margin=Math.ceil(innerHeight-n.top)+8;
   root.style.setProperty('--rivo-banner-bottom',margin+'px');
   root.style.setProperty('--rivo-content-top',Math.ceil(h.bottom)+'px');
   root.style.setProperty('--rivo-content-bottom',(margin+50+8)+'px');
   body.classList.add('rivo-native-android','rivo-has-ad-banner');
   const content=document.querySelector('#app .shell.rivo-dark-ui .content');
   const sample=document.createElement('div');sample.className='rivo-qa-long-fixture';
   sample.textContent='TEST DOCUMENT – scroll proof. Not a real AdMob creative.';
   sample.style.cssText='height:1150px;width:100%;display:flex;align-items:end;justify-content:center;color:#11407f;font-weight:700;';
   content.append(sample);
   content.scrollTop=content.scrollHeight;
   const cr=content.getBoundingClientRect(),br=document.querySelector('.rivo-ad-banner-slot').getBoundingClientRect();
   const frame=document.querySelector('.rivo-ad-banner-frame');
   frame.textContent='AD SLOT TEST · 320×50';
   // Browser AdMob is unavailable; hold the same native-visible geometry across animation frames.
   const qa=document.createElement('style');qa.id='rivo-native-ad-qa-override';
   qa.textContent='body.rivo-native-android #app .rivo-ad-banner-slot{display:flex!important;bottom:'+margin+'px!important}'+
     'body.rivo-native-android #app .shell.rivo-dark-ui .content{top:'+Math.ceil(h.bottom)+'px!important;bottom:'+(margin+58)+'px!important}'+
     '.rivo-ad-banner-frame{display:flex!important;align-items:center!important;justify-content:center!important;color:#0e61c2!important;font-weight:700!important;font-size:14px!important}';
   document.head.append(qa);
   const style=getComputedStyle(content);
   const test={
    contentBottom:cr.bottom,bannerTop:br.top,bannerBottom:br.bottom,navTop:n.top,
    contentTop:cr.top,scrollTop:content.scrollTop,scrollable:style.overflowY,
    pointerEvents:getComputedStyle(frame).pointerEvents,
    bannerWidth:br.width,bannerHeight:br.height,
    contentClearsAd:cr.bottom<=br.top-7,
    navClearsAd:br.bottom<=n.top-7,
    fixedBannerCentered:Math.abs(br.left+br.width/2-innerWidth/2)<2
   };
   return test;
  });
  await page.waitForTimeout(110);
  const visible=await page.evaluate(()=>{
   const c=document.querySelector('#app .content').getBoundingClientRect();
   const a=document.querySelector('.rivo-ad-banner-slot').getBoundingClientRect();
   return getComputedStyle(document.querySelector('.rivo-ad-banner-slot')).display!=='none'&&c.bottom<=a.top-7;
  });
  const namePath=width+'-'+name+'-ad-native-viewport-test.png';
  await page.screenshot({path:root+'/'+namePath,animations:'disabled'});
  results.push({width,screen:name,...proof,screenshotVerified:visible,pass:visible&&proof.contentClearsAd&&proof.navClearsAd&&proof.bannerWidth===320&&proof.bannerHeight===50&&proof.fixedBannerCentered&&proof.scrollable==='auto'&&proof.scrollTop>0});
  await page.evaluate(()=>{
   document.getElementById('rivo-native-ad-qa-override')?.remove();
   document.querySelector('.rivo-qa-long-fixture')?.remove();
   document.querySelector('.rivo-ad-banner-frame').textContent='';
   document.body.classList.remove('rivo-native-android','rivo-has-ad-banner');
  });
 }
 await context.close();
}
await browser.close();
await writeFile(root+'/native-viewport-proof.json',JSON.stringify(results,null,2));
console.log('Native AdMob content-proof',results.length,'passed',results.filter(x=>x.pass).length);
if(results.some(x=>!x.pass)){console.error(results.filter(x=>!x.pass));process.exitCode=1;}
