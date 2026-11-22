/* Actual RivoScan web runtime layout QA. These screenshots are browser-emulated,
 * not Android hardware or live AdMob proofs. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_QA_DIR||'/tmp/rivo-04573-browser-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const report={screens:[],checks:[],failures:[]};
const check=(label,result)=>{report.checks.push({label,pass:!!result});if(!result)report.failures.push(label);};
try{
 for(const [width,height,lang] of [
  [320,640,'auto'],[360,760,'auto'],[393,852,'auto'],
  [412,915,'auto'],[768,1024,'auto'],[640,360,'auto'],
  [393,852,'fr'],[393,852,'ar']
 ]){
  const id=width+'x'+height+'-'+lang;
  const context=await browser.newContext({viewport:{width,height},locale:lang==='fr'?'fr-FR':'en-US',isMobile:width<768,hasTouch:width<768,permissions:['camera']});
  await context.addInitScript(language=>{
   localStorage.setItem('rivo-release-notes-read','0.45.73');
   if(language==='auto')localStorage.removeItem('rivo-language');
   else localStorage.setItem('rivo-language',language);
  },lang);
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('.rivo-compact-home').waitFor({timeout:25000});
  // Emulate only native WebView's reserved-content CSS; not an Android screenshot.
  await page.evaluate(()=>{
    document.body.classList.add('rivo-native-android','rivo-has-ad-banner');
    document.documentElement.style.setProperty('--rivo-content-top','70px');
    document.documentElement.style.setProperty('--rivo-content-bottom','175px');
    document.documentElement.style.setProperty('--rivo-banner-bottom','104px');
  });
  await page.waitForTimeout(220);
  const home=await page.evaluate(()=>{
   const r=e=>e?.getBoundingClientRect();
   const trust=r(document.querySelector('.rivo-home-trust'));
   const rail=r(document.querySelector('.rivo-feature-rail'));
   const search=r(document.querySelector('.rivo-home-search-title-row'));
   const docs=r(document.querySelector('#home-recents'));
   const root=document.querySelector('.rivo-compact-home');
   const select=document.querySelector('#header-language');
   const locale=document.querySelector('.rivo-top-locale'),display=document.querySelector('.rivo-locale-visible-value');
   const l=r(locale),d=r(display),headerControls=r(document.querySelector('.rivo-top-controls'));
   const tiles=[...document.querySelectorAll('.rivo-feature-tile')];
   const clippedTile=tiles.some(el=>{
    const b=r(el),label=r(el.querySelector('strong'));
    return b.left< -1||b.right>innerWidth+1||label.bottom>b.bottom+1||label.top<b.top-1;
   });
   const content=r(document.querySelector('.content'));
   return{
    noOverlap:trust&&rail&&search&&docs&&trust.bottom<=rail.top+1&&rail.bottom<=search.top-1&&search.bottom<=docs.top+1,
    textFits:!clippedTile&&document.documentElement.scrollWidth<=innerWidth+2,
    railRows:new Set(tiles.map(t=>Math.round(r(t).top))).size,
    visibleLang:display?.textContent?.trim(),selected:select?.value,
    localeFits:l&&d&&headerControls&&l.left>=-1&&l.right<=innerWidth+1&&d.left>=l.left-1&&d.right<=l.right+1,
    localeUnclipped:display&&display.scrollWidth<=display.clientWidth+2,
    scrolling:getComputedStyle(root).overflowY,
    contentBottom:content?.bottom,
    bodyHeight:innerHeight,
   };
  });
  check(id+' Home card/search/recents do not overlap',home.noOverlap);
  check(id+' Home cards contained and no page horizontal overflow',home.textFits);
  check(id+' Home 2 or 4 columns by width',home.railRows===(width<=420?2:1));
  check(id+' language choice displays entirely',home.localeFits&&home.localeUnclipped&&home.visibleLang===(lang==='auto'?'AUTO':lang.toUpperCase()));
  check(id+' language select stays functional',home.selected===(lang==='auto'?'auto':lang));
  check(id+' home scrolls on small viewports',home.scrolling==='auto');
  await page.screenshot({path:out+'/'+id+'-home.png'});report.screens.push(id+'-home.png');
  // Verify content scroll makes search/recents reachable regardless of height.
  const reachable=await page.evaluate(()=>{
   const home=document.querySelector('.rivo-compact-home'),target=document.querySelector('.rivo-home-search-title-row');
   target.scrollIntoView({block:'end'});
   const b=target.getBoundingClientRect(),h=home.getBoundingClientRect();
   return b.top>=h.top-2&&b.bottom<=h.bottom+2;
  });
  check(id+' My Files search reachable by scrolling',reachable);
  // Open the real Tools view, scroll to final Edit/utility card.
  await page.evaluate(()=>document.querySelector('.mobilebar [data-tab="tools"]')?.click());
  await page.locator('.rivo-tools-scroll').waitFor({timeout:12000});
  const tools=await page.evaluate(()=>{
   const scroll=document.querySelector('.rivo-tools-scroll'),last=[...(scroll?.querySelectorAll('.rivo-hub-tile')||[])].at(-1);
   if(!scroll||!last)return {ok:false};
   scroll.scrollTop=scroll.scrollHeight;last.scrollIntoView({block:'end'});
   const a=scroll.getBoundingClientRect(),b=last.getBoundingClientRect();
   const style=getComputedStyle(scroll);
   return {ok:b.top>=a.top-2&&b.bottom<=a.bottom+3&&b.left>=-1&&b.right<=innerWidth+1,
    overflow:style.overflowY,hasScroll:scroll.scrollHeight>scroll.clientHeight};
  });
  check(id+' Tools last card fully reachable above ad safe band',tools.ok);
  check(id+' Tools scrolls independently',tools.overflow==='auto');
  const toolLocale=await page.evaluate(()=>{
   const el=document.querySelector('.rivo-locale-visible-value'),label=document.querySelector('.rivo-top-locale');
   if(!el||!label)return false;
   const a=el.getBoundingClientRect(),b=label.getBoundingClientRect();
   return a.width>24&&a.left>=b.left-1&&a.right<=b.right+1&&
     el.scrollWidth<=el.clientWidth+2&&
     el.textContent.trim()==='${lang==='auto'?'AUTO':lang.toUpperCase()}';
  });
  check(id+' AUTO fully displayed on Tools header (with back button)',toolLocale);

  await page.screenshot({path:out+'/'+id+'-tools-bottom.png'});report.screens.push(id+'-tools-bottom.png');
  if(width===393&&lang==='auto'){
   await page.evaluate(()=>document.querySelector('.mobilebar [data-go="home"]')?.click());
   await page.locator('.rivo-feature-tile[data-rivo-feature="plateScanner"]').click({timeout:8000});
   const modal=page.locator('.rivo-plate-overlay .rivo-live-split-stage');
   await modal.waitFor({timeout:14000});
   const plate=await modal.evaluate(stage=>{
    const camera=stage.querySelector('.rivo-live-preview'),results=stage.querySelector('.rivo-live-results-pane');
    const r=e=>e.getBoundingClientRect(),a=r(camera),b=r(results),c=r(stage);
    return a.bottom<=b.top-3&&Math.abs(a.height-b.height)<=15&&
      a.left>=c.left-2&&a.right<=c.right+2&&b.bottom<=c.bottom+2&&
      getComputedStyle(stage).gridTemplateColumns.split(' ').length===1;
   });
   check(id+' Plate camera above results, two comparable halves',plate);
   await page.screenshot({path:out+'/'+id+'-plate-modal.png'});report.screens.push(id+'-plate-modal.png');
  }
  check(id+' no JavaScript page error',errors.length===0);
  await context.close();
 }
}finally{
 await browser.close();
 await writeFile(out+'/responsive-report.json',JSON.stringify(report,null,2));
}
console.log(JSON.stringify({checks:report.checks.length,failed:report.failures.length,failures:report.failures},null,2));
assert.equal(report.failures.length,0,'Responsive screenshot checks found layout regressions');
