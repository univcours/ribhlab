/* Actual RivoScan frontend visual QA. Screenshots are from Chrome browser
 * with camera simulation, not physical Android captures. No mocks of UI.
 * Run after Vite build/preview on http://127.0.0.1:4173.
 */
const puppeteer=require('puppeteer-core');
const fs=require('node:fs'),path=require('node:path');
const out=path.join(process.cwd(),'qa','04574');
fs.mkdirSync(out,{recursive:true});
const sizes=[[320,700],[360,780],[393,852],[412,915],[540,960],[768,1024]];
const report={appVersion:'0.45.74',source:'actual RivoScan Vite preview in headless Chrome; camera video simulated',sizes:[],errors:[]};
const pause=t=>new Promise(r=>setTimeout(r,t));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const chrome=process.env.CHROME_BIN||[
'/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
'/usr/bin/chromium','/usr/bin/chromium-browser'
].find(p=>fs.existsSync(p));
assert(!!chrome,'Google Chrome/Chromium not found on runner');
(async()=>{
const browser=await puppeteer.launch({headless:true,executablePath:chrome,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try{
 for(const [width,height] of sizes){
  const page=await browser.newPage();
  await page.setViewport({width,height,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push({width,error:e.message}));
  await page.evaluateOnNewDocument(()=>{
   localStorage.removeItem('rivo-language');
   localStorage.setItem('rivo-release-notes-read','0.45.74');
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
  await pause(850);
  // New installs may show What's New above the genuine app:
  await page.evaluate(()=>{
   document.querySelector('[data-rivo-whats-new-close]')?.click();
   document.querySelector('.rivo-whats-new-close')?.click();
  });
  await pause(150);
  const home=await page.evaluate(()=>{
   const rect=sel=>{const el=document.querySelector(sel);
    if(!el)return null;
    const r=el.getBoundingClientRect();
    return {top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
   };
   const rail=rect('.rivo-feature-rail');
   const search=rect('.rivo-home-search-title-row');
   const cards=[...document.querySelectorAll('.rivo-feature-rail>.rivo-feature-tile')]
    .map(el=>{let r=el.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,background:getComputedStyle(el).backgroundImage,
       label:el.textContent.trim()};});
   const topbar=document.querySelector('.topbar'),locale=document.querySelector('.rivo-top-locale');
    const lang=document.querySelector('#header-language'),brand=document.querySelector('.topbar .crumb'),controls=document.querySelector('.rivo-top-controls');
    const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom};};
    return{rail,search,cards,overflow:document.documentElement.scrollWidth>innerWidth+2,
      header:{topbar:box(topbar),locale:box(locale),lang:box(lang),brand:box(brand),controls:box(controls),
        value:lang?.value,text:lang?.selectedOptions?.[0]?.text,langWidth:lang?.clientWidth,langScrollWidth:lang?.scrollWidth}};
  });
  assert(home.rail&&home.search&&home.cards.length===4,'Home missing cards/search at '+width);
  const bottom=Math.max(...home.cards.map(c=>c.bottom));
  assert(bottom<=home.rail.bottom+1,'Home card escapes grid row at '+width+' by '+(bottom-home.rail.bottom));
  assert(home.rail.bottom+5<=home.search.top,'Home card/search overlap at '+width+': '+home.rail.bottom+' vs '+home.search.top);
  assert(bottom+5<=home.search.top,'My Files obscured by Home cards at '+width);
  assert(!home.overflow,'Horizontal Home viewport overflow at '+width);
  assert(home.header.text==='AUTO','Language is not AUTO at '+width+': '+JSON.stringify(home.header));
  assert(home.header.value==='auto','Automatic language mode is not selected at '+width);
  assert(home.header.locale.width>=105,'Language selector cropped at '+width);
  assert(home.header.locale.right<=home.header.topbar.right+1,'Locale control outside topbar at '+width);
  assert(home.header.brand.right<=home.header.controls.left+1,'Brand and locale buttons overlap at '+width);
  assert(home.header.langScrollWidth<=home.header.langWidth+3,'AUTO text overflows select at '+width);
  assert(new Set(home.cards.map(c=>c.background)).size===4,'Home color styles not distinct');
  await page.screenshot({path:path.join(out,'browser-'+width+'-home.png')});
  await page.evaluate(()=>document.querySelector('.mobilebar [data-tab="tools"]')?.click());
  await pause(400);
  const tools=await page.evaluate(()=>{
   const viewport=document.querySelector('.rivo-tools-scroll');
   const cards=[...document.querySelectorAll('.rivo-tools-scroll .rivo-hub-tile')];
   if(!viewport)return{error:'Tools viewport absent'};
   viewport.scrollTop=viewport.scrollHeight;
   const bound=viewport.getBoundingClientRect();
   const last=cards.at(-1)?.getBoundingClientRect();
   return {count:cards.length,scrollHeight:viewport.scrollHeight,clientHeight:viewport.clientHeight,
    scrollTop:viewport.scrollTop,scrollBottom:bound.bottom,lastBottom:last?.bottom,lastTop:last?.top};
  });
  assert(!tools.error&&tools.count>10,'Tools list not mounted at '+width);
  assert(tools.clientHeight>=Math.max(200,height*.35),'Tools scroll region collapsed at '+width+': '+JSON.stringify(tools));
  assert(tools.lastTop<=tools.scrollBottom-28&&tools.lastBottom>tools.scrollBottom-100,
   'Last Tools card is outside the visible scroll viewport at '+width+': '+JSON.stringify(tools));
  assert(tools.lastBottom<=tools.scrollBottom+3&&tools.lastBottom>=tools.scrollBottom-180,'Last Tools card is not visible after scrolling to end at '+width+' '+JSON.stringify(tools));
  await page.screenshot({path:path.join(out,'browser-'+width+'-tools-end.png')});
  report.sizes.push({width,height,home:{railBottom:home.rail.bottom,lastCardBottom:bottom,searchTop:home.search.top,distinctColors:new Set(home.cards.map(c=>c.background)).size,header:home.header},tools});
  await page.evaluate(()=>document.querySelector('.mobilebar [data-go="home"]')?.click());
  await page.waitForSelector('.rivo-home .rivo-feature-rail',{timeout:12000});
  await pause(200);
  await page.evaluate(()=>document.querySelector('[data-rivo-feature="plateScanner"]')?.click());
  await page.waitForSelector('.rivo-plate-overlay .rivo-live-split-stage',{timeout:12000});
  await pause(400);
  const plate=await page.evaluate(()=>{
   const get=sel=>{let el=document.querySelector(sel);if(!el)return null;
    const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
   return{stage:get('.rivo-plate-overlay .rivo-live-split-stage'),
    camera:get('.rivo-plate-overlay .rivo-live-preview'),
    results:get('.rivo-plate-overlay .rivo-live-results-pane'),
    headerTitle:get('.rivo-plate-overlay .rivo-live-head>strong'),
    searchRow:get('.rivo-plate-overlay .rivo-plate-search-row'),
    searchInput:get('.rivo-plate-overlay .rivo-plate-search'),
    banner:get('.rivo-ad-banner-slot')};
  });
  assert(plate.stage&&plate.camera&&plate.results,'Plate layout missing '+width);
  assert(plate.headerTitle&&plate.searchRow&&plate.searchInput,'Plate search controls missing at '+width);
  assert(plate.headerTitle.bottom<=plate.searchRow.top+1,'Plate search overlaps heading at '+width);
  assert(plate.searchInput.width>=190,'Plate number field too narrow at '+width);
  assert(plate.searchRow.bottom<=plate.camera.top+2,'Plate input overlaps camera viewport at '+width);
  assert(plate.camera.bottom<=plate.results.top+1,'Plate camera must be ABOVE results, not next to them '+width);
  assert(Math.abs(plate.camera.width-plate.results.width)<6,'Plate panes must share full stage width '+width);
  assert(Math.abs(plate.camera.height-plate.results.height)<20,'Plate panes must be close to 50/50 '+width);
  assert(plate.results.bottom<=plate.stage.bottom+3,'Plate results clipped by stage '+width);
  await page.screenshot({path:path.join(out,'browser-'+width+'-plate.png')});
  // QR / barcode must retain its earlier side-by-side layout.
  await page.evaluate(()=>document.querySelector('.rivo-plate-overlay [data-scan-overlay-close]')?.click());
  await pause(200);
  await page.evaluate(()=>document.querySelector('[data-rivo-feature="scanCode"]')?.click());
  await page.waitForSelector('.rivo-code-overlay .rivo-live-split-stage',{timeout:12000});
  const qr=await page.evaluate(()=>{
   const g=sel=>{let e=document.querySelector(sel),r=e?.getBoundingClientRect();return r?{top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width}:null};
   return {camera:g('.rivo-code-overlay .rivo-live-preview'),results:g('.rivo-code-overlay .rivo-live-results-pane')};
  });
  assert(qr.camera&&qr.results,'QR scanner did not mount');
  assert(qr.camera.right<=qr.results.left+2,'QR side-by-side layout was unintentionally changed at '+width);
  await page.screenshot({path:path.join(out,'browser-'+width+'-qr.png')});
  report.sizes[report.sizes.length-1].plate=plate;
  report.sizes[report.sizes.length-1].qr=qr;
  await page.close();
 }
}finally{fs.writeFileSync(path.join(out,'visual-qa-report.json'),JSON.stringify(report,null,2));await browser.close()}
assert(report.errors.length===0,'Page errors: '+JSON.stringify(report.errors));
console.log('PASS 0.45.74: six viewports, full AUTO header, nonoverlap Home, Tools scrolling, vertical Plate 50/50, QR horizontal');
})().catch(e=>{report.errors.push({fatal:e.message});fs.writeFileSync(path.join(out,'visual-qa-report.json'),JSON.stringify(report,null,2));console.error(e);process.exit(1)});
