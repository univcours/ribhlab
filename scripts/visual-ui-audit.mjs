// Browser-level visual & interaction regression checks for the real RivoScan WebView.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_VISUAL_OUTPUT||'/tmp/rivoscan-visual-ui';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report={name:'RivoScan visual WebView audit',screens:[],failures:[],checks:[]};
const sizes=[{width:320,height:640},{width:360,height:800},{width:393,height:873},{width:412,height:915}];
const check=(ok,name)=>{report.checks.push({name,ok:!!ok});if(!ok)report.failures.push(name)};
try{
 for(const {width,height} of sizes){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
   localStorage.setItem('rivo-language','en');
   localStorage.setItem('rivo-release-notes-read','0.45.0');
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle',timeout:35000});
  await page.locator('.rivo-compact-home').waitFor({timeout:20000});
  await page.screenshot({path:out+'/'+width+'-home.png',fullPage:false});
  const navigate=async(tab,visible)=>{
   // Only the real, visible Android footer, never a hidden desktop sidebar.
   const selector=tab==='library'?'.mobilebar [data-open-library]":tab==='home'?'.mobilebar [data-go=home]":'.mobilebar [data-tab="'+tab+'"]';
   await page.locator(selector).click({timeout:15000});
   await page.locator(visible).waitFor({state:'visible',timeout:10000});
  };
  await navigate('library','.library-workspace');
  await page.screenshot({path:out+'/'+width+'-documents.png',fullPage:false});
  const library=await page.evaluate(()=>{
   const rails=['.library-heading-actions','.rivo-library-chips','.storage-actions'];
   return rails.map(selector=>{
    const el=document.querySelector(selector),style=el&&getComputedStyle(el);
    return {selector,display:style?.display,wrap:style?.flexWrap,direction:style?.flexDirection,overflowX:style?.overflowX};
   });
  });
  for(const rail of library){
   check(rail.display==='flex'&&rail.wrap==='nowrap'&&rail.direction==='row',
    width+': '+rail.selector+' is one horizontal row');
  }
  await navigate('tools','.rivo-tools-hub');
  const tools=await page.evaluate(()=>{
   const tiles=[...document.querySelectorAll('.rivo-hub-tile')];
   const rows=[...document.querySelectorAll('.rivo-hub-grid')].map(el=>{
    const style=getComputedStyle(el);
    const children=[...el.querySelectorAll(':scope > .rivo-hub-tile')];
    const ys=children.map(x=>Math.round(x.getBoundingClientRect().top));
    return {display:style.display,wrap:style.flexWrap,
      scroll:style.overflowX,sameLine:new Set(ys).size<=1,count:children.length,
      width:Math.round(el.getBoundingClientRect().width)};
   });
   return {total:tiles.length,rows};
  });
  check(tools.total===17,width+': 17 non-duplicated tool cards visible');
  for(const [i,row] of tools.rows.entries()){
   check(row.display==='flex'&&row.wrap==='nowrap'&&row.sameLine,
    width+': Tools category '+i+' is one horizontal line');
   check(row.width<=width+2,width+': Tools category '+i+' fits screen');
  }
  await page.screenshot({path:out+'/'+width+'-tools.png',fullPage:false});
  await page.locator('[data-hub-action="convertDocument"]').click();
  await page.locator('.rivo-merged-overlay').waitFor({state:'visible'});
  check(await page.locator('.rivo-merged-dialog select option').count()===10,
   width+': merged converter preserves 10 formats');
  await page.locator('[data-merged-close]').click();
  await navigate('me','.app-settings');
  const settings=await page.evaluate(()=>{
   const e=document.querySelector('.rivo-settings-actions');
   const s=e&&getComputedStyle(e);
   return {display:s?.display,wrap:s?.flexWrap,items:e?.querySelectorAll('button').length};
  });
  check(settings.display==='flex'&&settings.wrap==='nowrap'&&settings.items===2,
   width+': settings actions one compact horizontal row');
  await page.screenshot({path:out+'/'+width+'-settings.png',fullPage:false});
  const overflow=await page.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   innerWidth:window.innerWidth
  }));
  check(overflow.scrollWidth<=overflow.innerWidth+3,
   width+': no page-level horizontal overflow');
  check(errors.length===0,width+': no uncaught WebView exceptions ('+errors.slice(0,2).join('; ')+')');
  report.screens.push({width,height,tools,library,settings,overflow,errors});
  await context.close();
 }
}finally{
 await browser.close();
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
}
console.log(JSON.stringify({checks:report.checks.length,failed:report.failures.length,
 screenshots:report.screens.length*4,failures:report.failures},null,2));
assert.equal(report.failures.length,0,'RivoScan UI visual audit must be clean');
