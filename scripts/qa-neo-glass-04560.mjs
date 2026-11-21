/* Screenshot and interaction QA of the ACTUAL 0.45.60 RivoScan WebView.
 * No mockups. Local browser rendering; physical Android verification remains separate.
 */
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.RIVO_NEO_QA_OUTPUT||'/tmp/rivo-neo-glass-04560';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
await mkdir(out,{recursive:true});
const report={version,description:'Real RivoScan WebView screen capture; not physical Android',devices:[],errors:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [width,height] of [[320,640],[360,800],[393,873]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce',locale:'en-US'});
  await ctx.addInitScript(v=>{
   localStorage.setItem('rivo-language','en');
   localStorage.setItem('rivo-release-notes-read',v);
  },version);
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(width+':'+e.message));
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.rivo-compact-home.rivo-neo-dashboard').waitFor({state:'visible',timeout:25000});
  const metrics=await page.evaluate(()=>{
   const home=document.querySelector('.rivo-neo-dashboard'),
      hero=home.querySelector('.rivo-neo-hero'),
      cards=[...home.querySelectorAll('.rivo-neo-card')],
      grid=home.querySelector('.rivo-neo-card-grid'),
      nav=document.querySelector('.mobilebar'),
      bar=document.querySelector('.topbar');
   const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   return {hero:rect(hero),home:rect(home),nav:rect(nav),header:rect(bar),
     cards:cards.map(c=>({label:c.querySelector('strong').textContent,rect:rect(c),route:c.hasAttribute('data-live-camera')?'scan':c.dataset.hubAction||c.dataset.tab})),
     columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
     canScroll:home.scrollHeight>home.clientHeight,
     homeScrollHeight:home.scrollHeight,homeClientHeight:home.clientHeight,
     documentScrollHeight:document.scrollingElement.scrollHeight,
     documentClientHeight:document.scrollingElement.clientHeight,
     contentScrollHeight:document.querySelector('.content').scrollHeight,
     contentClientHeight:document.querySelector('.content').clientHeight,
     overflowY:getComputedStyle(home).overflowY,
     overflow:document.documentElement.scrollWidth-innerWidth,
     cardOverflow:cards.some(c=>{const b=c.getBoundingClientRect();return b.left<0||b.right>innerWidth+1}),
     quickActions:home.querySelectorAll('[data-rivo-feature]').length,
     filesExists:!!home.querySelector('#home-recents'),
     searchExists:!!home.querySelector('#home-quick-search')
   };
  });
  console.log('Neo dashboard actual geometry',JSON.stringify({width,hero:metrics.hero,home:metrics.home,homeScrollHeight:metrics.homeScrollHeight,homeClientHeight:metrics.homeClientHeight,documentScrollHeight:metrics.documentScrollHeight,documentClientHeight:metrics.documentClientHeight,contentScrollHeight:metrics.contentScrollHeight,contentClientHeight:metrics.contentClientHeight,overflowY:metrics.overflowY}));
  await page.screenshot({path:out+'/'+width+'-neo-home-top.png',animations:'disabled'});
  assert.equal(metrics.cards.length,6,width+': six functional home cards');
  assert.equal(metrics.columns,2,width+': two equal responsive columns');
  assert.equal(metrics.quickActions,4,width+': original four actions remain');
  assert.ok(metrics.filesExists&&metrics.searchExists,width+': File Manager and search remain');
  assert.equal(metrics.cardOverflow,false,width+': card overflows viewport');
  assert.ok(metrics.overflow<=2,width+': whole document overflow '+metrics.overflow);
  assert.ok(metrics.canScroll || metrics.documentScrollHeight>metrics.documentClientHeight+5 || metrics.contentScrollHeight>metrics.contentClientHeight+5,width+': dashboard must be scrollable to reach all cards');
  assert.ok(metrics.nav.bottom<=height+2,width+': navigation remains visible');
  assert.ok(metrics.hero.height>=140,width+': hero must be legible');
  await page.locator('.rivo-neo-card-images').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/'+width+'-neo-home-cards.png',animations:'disabled'});
  await page.locator('.rivo-neo-card-id').click();
  const idDlg=page.locator('.rivo-id-photo-dialog').first();
  await idDlg.waitFor({state:'visible',timeout:14000});
  await page.screenshot({path:out+'/'+width+'-neo-real-IDPhoto.png',animations:'disabled'});
  await page.locator('[data-rivo-modal-close]').last().click();
  await idDlg.waitFor({state:'detached',timeout:12000});
  await page.locator('.rivo-neo-card-pdf').click();
  await page.locator('.rivo-tools-hub').waitFor({state:'visible',timeout:12000});
  const toolMetrics=await page.evaluate(()=>{
   const grid=document.querySelector('.rivo-hub-grid'),tiles=[...document.querySelectorAll('.rivo-hub-tile')];
   return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
      count:tiles.length,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert.equal(toolMetrics.columns,2,width+': Tools should be two columns');
  assert.equal(toolMetrics.count,18,width+': preserve all 18 tested Tools');
  assert.ok(toolMetrics.overflow<=2,width+': Tools viewport fits');
  await page.screenshot({path:out+'/'+width+'-neo-tools.png',animations:'disabled'});
  report.devices.push({width,height,home:metrics,tools:toolMetrics});
  await ctx.close();
 }
}finally{
 await browser.close();
 await writeFile(out+'/audit.json',JSON.stringify(report,null,2));
}
if(report.errors.length)throw Error('Browser errors: '+report.errors.join(';'));
console.log(JSON.stringify({result:'PASS',version,devices:report.devices.map(({width,home,tools})=>({width,heroHeight:home.hero.height,cardColumns:home.columns,scrolls:home.canScroll,toolCount:tools.count}))},null,2));
