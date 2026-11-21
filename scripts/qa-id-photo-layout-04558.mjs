/* Actual RivoScan WebView ID Photo QA, not a visual mockup.
 * Uses a synthetic color test fixture, not personal or user portraits.
 */
import {chromium} from 'playwright';
import pngjs from 'pngjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {PNG}=pngjs;
const out=process.env.RIVO_IDPHOTO_QA_OUTPUT||'/tmp/rivo-idphoto-04558';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
await mkdir(out,{recursive:true});
const report={version,source:'Real RivoScan browser-rendered WebView; native Android still requires device QA',tests:[],errors:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const fixture=new PNG({width:120,height:150});
for(let y=0;y<150;y++)for(let x=0;x<120;x++){
 const k=(y*120+x)*4;
 fixture.data[k]=x<60?24:62;fixture.data[k+1]=y<75?110:75;
 fixture.data[k+2]=175;fixture.data[k+3]=255;
}
const img=PNG.sync.write(fixture);
try{
 for(const [width,height] of [[320,640],[360,800],[393,873]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await ctx.addInitScript(v=>{
   localStorage.setItem('rivo-language','en');
   localStorage.setItem('rivo-release-notes-read',v);
  },version);
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(String(e.message)));
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.rivo-compact-home').waitFor({timeout:25000});
  await page.locator('.mobilebar [data-tab="tools"]').first().click();
  const action=page.locator('[data-hub-action="idPhotoMaker"]').first();
  await action.scrollIntoViewIfNeeded();await action.click();
  const dlg=page.locator('.rivo-id-photo-dialog.rivo-shared-preview-dialog');
  await dlg.waitFor({state:'visible',timeout:12000});
  const measure=()=>page.evaluate(()=>{
   const panel=document.querySelector('.rivo-id-photo-dialog'),dock=panel.querySelector('.rivo-shared-preview-dock'),
    drawer=panel.querySelector('.rivo-workspace-settings'),
    footer=panel.querySelector('.rivo-workspace-bottom');
   const rect=n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right}};
   return {panel:rect(panel),dock:rect(dock),drawer:rect(drawer),footer:rect(footer),
    drawerVisible:getComputedStyle(drawer).display!=='none',
    selected:panel.classList.contains('rivo-id-photo-ready'),
    saveDisabled:footer.querySelector('button').disabled,
    scrollOverflow:document.documentElement.scrollWidth-innerWidth,
    viewportHeight:innerHeight};
  });
  const empty=await measure();
  assert.equal(empty.selected,false,width+': start unselected');
  assert.equal(empty.saveDisabled,true,width+': save disabled before photo');
  assert.ok(empty.dock.height<=200,width+': empty preview too tall '+empty.dock.height);
  assert.ok(empty.dock.height<=height*.28,width+': empty preview should be compact');
  assert.ok(empty.panel.height<=height*.89,width+': compact modal should not be full screen');
  assert.ok(empty.panel.top>=-1&&empty.panel.bottom<=height+1,width+': empty panel clipped');
  assert.ok(Math.abs(empty.drawer.top-empty.dock.bottom)<=4,width+': settings directly below preview');
  assert.ok(Math.abs(empty.footer.top-empty.drawer.bottom)<=4,width+': footer directly below controls');
  assert.ok(empty.scrollOverflow<=2,width+': empty horizontal overflow');
  await page.screenshot({path:out+'/'+width+'-empty-real-ui.png',animations:'disabled'});
  const gear=dlg.locator('.rivo-workspace-settings-toggle');
  await gear.click();
  assert.equal((await measure()).drawerVisible,false,width+': gear should hide settings');
  await gear.click();
  assert.equal((await measure()).drawerVisible,true,width+': gear should reopen settings');
  await page.locator('.rivo-id-native-file').setInputFiles({name:'QA_color_fixture.png',mimeType:'image/png',buffer:img});
  await page.locator('.rivo-id-photo-ready').waitFor({timeout:12000});
  await page.waitForFunction(()=>{const c=document.querySelector('.rivo-id-photo-dialog canvas');return c&&!c.hidden&&c.width>500&&c.height>800});
  const loaded=await measure();
  assert.equal(loaded.selected,true,width+': ready state after importing photo');
  assert.equal(loaded.saveDisabled,false,width+': save enabled after photo');
  assert.ok(loaded.dock.height>empty.dock.height+40,width+': loaded preview should expand');
  assert.ok(loaded.panel.bottom<=height+1,width+': loaded editor outside viewport');
  assert.ok(loaded.scrollOverflow<=2,width+': loaded horizontal overflow');
  await page.screenshot({path:out+'/'+width+'-loaded-QA-fixture.png',animations:'disabled'});
  report.tests.push({width,height,empty,loaded});
  await ctx.close();
 }
}finally{
 await browser.close();
 await writeFile(out+'/audit.json',JSON.stringify(report,null,2));
}
if(report.errors.length)throw Error('Browser JS errors: '+report.errors.join('; '));
console.log(JSON.stringify({result:'PASS',version,sizes:report.tests.map(x=>({width:x.width,emptyDock:x.empty.dock.height,loadedDock:x.loaded.dock.height,compactDialog:x.empty.panel.height})),errors:report.errors}));
