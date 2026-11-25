import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { toolGroups } from '../src/tools-hub.js';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const out=process.env.RIVO_DEEP_QA_DIR||'qa-results/browser';
const url=process.env.RIVO_URL||'http://127.0.0.1:4173';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const report={version,scope:'actual compiled Web UI; not Android camera, storage or live ad proof',started:new Date().toISOString(),scenarios:[],controls:[],errors:[]};
const tools=toolGroups.flatMap(g=>g.entries);
const nav={home:'nav.mobilebar [data-go="home"]',documents:'nav.mobilebar [data-open-library]',tools:'nav.mobilebar [data-tab="tools"]',settings:'nav.mobilebar [data-tab="me"]'};
const modal='.rivo-code-overlay,.rivo-plate-overlay,.rivo-id-overlay,.rivo-merged-overlay,.rivo-shield-overlay,.rivo-pages-overlay';
const controlSelector='button,a[href],input,select,textarea,[role=button],[role=switch],[role=checkbox],[role=tab]';
const flush=async()=>{await writeFile(out+'/report.json',JSON.stringify(report,null,2));};
async function inventory(page,surface,config){
 const data=await page.evaluate(selector=>[...document.querySelectorAll(selector)].map((e,i)=>{
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);
   if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none'||e.closest('[hidden]'))return null;
   const label=(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.labels?.[0]?.innerText||e.placeholder||'').trim().replace(/\s+/g,' ').slice(0,150);
   const attrs=[...e.attributes].filter(a=>a.name.startsWith('data-')||a.name==='id'||a.name==='name').map(a=>a.name+'='+a.value).join(' ');
   const icon=e.querySelector('[data-material-symbol]');
   const visible=r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
   const x=Math.max(1,Math.min(innerWidth-1,r.left+r.width/2)),y=Math.max(1,Math.min(innerHeight-1,r.top+r.height/2));
   const top=visible?document.elementFromPoint(x,y):null;
   const issues=[];
   if(!label&&!['file','hidden','range'].includes(e.type))issues.push('MISSING_ACCESSIBLE_LABEL');
   if(e.tagName==='BUTTON'&&Math.min(r.width,r.height)<44)issues.push('TOUCH_TARGET_UNDER_44_CSS_PX');
   if(r.left< -2||r.right>innerWidth+2)issues.push('HORIZONTAL_OVERFLOW');
   if(visible&&top&&!e.contains(top)&&!top.contains(e))issues.push('POSSIBLY_OCCLUDED');
   return {index:i,tag:e.tagName,type:e.type||'',label,attrs,icon:icon?.getAttribute('data-material-symbol')||null,disabled:e.disabled||e.getAttribute('aria-disabled')==='true',rect:[r.x,r.y,r.width,r.height].map(Math.round),visibleInViewport:visible,issues,verification:'INVENTORIED_ONLY'};
 }).filter(Boolean),controlSelector);
 report.controls.push(...data.map(c=>({surface,...config,...c})));
 await page.screenshot({path:out+'/'+config.width+'-'+config.locale+'-'+surface.replace(/[^a-z0-9_-]/gi,'_')+'.png',animations:'disabled'});
 return data;
}
async function setup(config){
 const context=await browser.newContext({viewport:{width:config.width,height:852},isMobile:true,hasTouch:true,locale:config.locale,acceptDownloads:true});
 await context.addInitScript(({version,lang})=>{localStorage.setItem('rivo-release-notes-read',version);localStorage.setItem('rivo-language',lang);},{version,lang:config.locale.split('-')[0]});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({config,message:e.message}));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator(nav.home).waitFor({timeout:20000});
 return {context,page};
}
async function scenario(name,config,fn){
 const entry={name,...config,status:'FAIL',level:'FUNCTIONAL',detail:''};
 let context,page;
 try{({context,page}=await setup(config)); const result=await fn(page,context);Object.assign(entry,{status:'PASS',...result});}
 catch(e){entry.detail=String(e.message||e).slice(0,1200);if(page)await page.screenshot({path:out+'/failure-'+name.replace(/\W/g,'_')+'-'+config.width+'-'+config.locale+'.png'}).catch(()=>{});}
 finally{if(context)await context.close();report.scenarios.push(entry);await flush();}
}
const defaults={width:393,locale:'en-US'};
try{
 // Inventory all four primary routes at three phone widths plus tablet, LTR/RTL.
 for(const config of [{width:320,locale:'en-US'},defaults,{width:768,locale:'en-US'},{width:393,locale:'fr-FR'},{width:393,locale:'ar-MA'}]){
  await scenario('navigation-and-design',config,async page=>{
   for(const [surface,sel] of Object.entries(nav)){
    await page.locator(sel).click();
    await page.waitForTimeout(250);
    const expected={home:'#home-recents',documents:'#library-list',tools:'.rivo-tools-hub',settings:'#language'}[surface];
    await page.locator(expected).first().waitFor({state:'visible'});
    await inventory(page,surface,config);
   }
   assert.equal(await page.locator('nav.mobilebar button[data-live-camera]').count(),1);
   return {level:'NAVIGATION_AND_GEOMETRY',detail:'All four actual routes opened; visible control inventory and screenshots saved'};
  });
 }
 // Every curated tool entry has an explicit outcome. Opening a dialog alone is
 // not counted as functional success for OCR, camera, translation, etc.
 for(const id of tools){
  await scenario('tool-'+id,defaults,async page=>{
   await page.locator(nav.tools).click();
   const tile=page.locator('[data-hub-action="'+id+'"]:visible');
   assert.equal(await tile.count(),1,'Missing/duplicate tool tile');
   const before=await page.locator('body').innerText();
   const chooser=page.waitForEvent('filechooser',{timeout:7000}).catch(()=>null);
   await tile.click({timeout:10000});
   await page.waitForTimeout(500);
   const dialogs=page.locator(modal+',[role=dialog]');
   const opened=await dialogs.count()>0&&await dialogs.first().isVisible();
   const workspace=await page.locator('#files,#peer-offer').count()>0;
   let picker=false;
   if(['managePages','photoStudio'].includes(id)){picker=!!await chooser;assert.ok(picker,'Expected actual file chooser');}
   else if(id==='idcard'){assert.ok(workspace||opened||await page.locator('body').innerText()!==before,'No observable camera action');}
   else assert.ok(opened||workspace,'No dialog or functional workspace opened for '+id);
   await inventory(page,'tool-'+id,defaults);
   return {level:'ENTRY_ONLY',detail:picker?'Actual file chooser opened; output not tested here':'Actual tool route/modal opened; end-to-end output not implied'};
  });
 }
 await scenario('language-sound-persistence',defaults,async page=>{
  const sound=page.locator('#header-sound-toggle'),before=await sound.getAttribute('aria-pressed');
  await sound.click();assert.notEqual(await sound.getAttribute('aria-pressed'),before);
  await page.locator('#header-language').selectOption('fr');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#header-language').inputValue(),'fr');
  assert.notEqual(await page.locator('#header-sound-toggle').getAttribute('aria-pressed'),before);
  return {detail:'Actual UI controls changed values; both persisted after reload'};
 });
 await scenario('combine-pdf-order-remove-output',defaults,async page=>{
  const fixture=async (name,width)=>{const d=await PDFDocument.create();d.addPage([width,400]);return {name,mimeType:'application/pdf',buffer:Buffer.from(await d.save())};};
  const a=await fixture('QA-A.pdf',300),b=await fixture('QA-B.pdf',500),c=await fixture('QA-C.pdf',700);
  await page.locator(nav.tools).click();
  await page.locator('[data-hub-action="combineFiles"]:visible').click();
  await page.locator('#files').setInputFiles([a,b,c]);
  await page.locator('#filelist').getByText('QA-C.pdf').waitFor();
  await inventory(page,'combine-with-fixtures',defaults);
  await page.locator('#filelist [data-remove="2"]').click();
  assert.equal(await page.locator('#filelist').getByText('QA-C.pdf').count(),0);
  await page.locator('#filelist [data-move="1"][data-dir="-1"]').click();
  const pending=page.waitForEvent('download',{timeout:30000});
  await page.locator('#process').click();const download=await pending;
  const path=out+'/verified-combined.pdf';await download.saveAs(path);
  const bytes=await readFile(path),pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(p=>p.getWidth()),[500,300],'Actual output must preserve chosen order');
  return {detail:'Real generated PDF parsed: 2 pages, widths 500 then 300; removed file absent',sha256:createHash('sha256').update(bytes).digest('hex')};
 });
}finally{
 await browser.close();
 report.summary={scenarios:report.scenarios.length,passed:report.scenarios.filter(x=>x.status==='PASS').length,failed:report.scenarios.filter(x=>x.status==='FAIL').length,controls:report.controls.length,designFlags:report.controls.reduce((n,x)=>n+x.issues.length,0),uncaughtErrors:report.errors.length};
 await flush();
 const csv=['surface,width,locale,label,selector,issues,verification',...report.controls.map(c=>[c.surface,c.width,c.locale,c.label,c.attrs,c.issues.join('|'),c.verification].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(','))].join('\n');
 await writeFile(out+'/controls.csv',csv);
 console.log('RIVO_DEEP_QA_SUMMARY '+JSON.stringify(report.summary));
 for(const x of report.scenarios.filter(x=>x.status==='FAIL'))console.error('FAIL '+x.name+' '+x.detail);
 if(report.summary.failed||report.summary.uncaughtErrors)process.exitCode=1;
}
