// Browser QA of all 19 ACTUAL RivoScan Tool destinations. No private files.
// Android native cameras, AdMob, and OS file chooser visuals are not simulated.
import {chromium} from 'playwright';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {toolGroups,hubLabel} from '../src/tools-hub.js';
const root=process.env.RIVO_TOOL_WINDOWS_OUT||'/tmp/rivoscan-all-tools';
const origin=process.env.RIVO_URL||'http://127.0.0.1:4173';
await mkdir(root,{recursive:true});
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const pdf=await PDFDocument.create(),pg=pdf.addPage([595,842]);
const font=await pdf.embedFont(StandardFonts.Helvetica);
pg.drawText('RivoScan SAMPLE PDF - UI REVIEW ONLY',{x:46,y:740,size:18,font});
pg.drawText('No personal information or real customer files.',{x:46,y:705,size:12,font});
const fixture=join(root,'TEST_SAMPLE.pdf');await writeFile(fixture,await pdf.save());
const samplePNG=join(root,'TEST_IMAGE.png');
await writeFile(samplePNG,await readFile(new URL('../public/rivoscan-icon.png',import.meta.url)));
const specs=toolGroups.flatMap(g=>g.entries.map(id=>({id,name:hubLabel('en',id,id),group:g.id})));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:393,height:873},isMobile:true,hasTouch:true,deviceScaleFactor:1,acceptDownloads:true});
const manifest={version,total:specs.length,source:'actual compiled RivoScan web UI',limitations:'Native Android camera and native AdMob do not render in a browser; fixture inputs are marked TEST.',tools:[]};
for(let i=0;i<specs.length;i++){
 const {id,name,group}=specs[i],prefix=String(i+1).padStart(2,'0')+'-'+id;
 const page=await context.newPage(),errors=[],files=[],fixtures=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('filechooser',async chooser=>{
  try{
   const accept=await (await chooser.element()).getAttribute('accept')||'';
   const target=/image\//.test(accept)&&!/pdf/.test(accept)?samplePNG:fixture;
   fixtures.push(target===samplePNG?'TEST_IMAGE.png':'TEST_SAMPLE.pdf');
   await chooser.setFiles(target);
  }catch(e){errors.push('Test file chooser: '+String(e));}
 });
 try{
  await page.addInitScript(v=>{localStorage.setItem('rivo-language','en');localStorage.setItem('rivo-release-notes-read',v)},version);
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.mobilebar [data-tab="tools"]').waitFor({state:'visible',timeout:18000});
  await page.locator('.mobilebar [data-tab="tools"]').click();
  const tile=page.locator('[data-hub-action="'+id+'"]');
  await tile.scrollIntoViewIfNeeded(); await tile.click({timeout:9000});
  await page.waitForTimeout(850);
  const file=prefix+'-window.png';
  await page.screenshot({path:join(root,file),animations:'disabled'});files.push(file);
  const info=await page.evaluate(()=>{
   const isVisible=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0;};
   const panels=['[data-rivo-managed-modal="true"]','[role="dialog"]','.rivo-perfectscan-overlay','.rivo-privacy-overlay','.rivo-editor-overlay','.rivo-code-overlay','.rivo-tools-hub','.content'];
   const shown=panels.filter(s=>[...document.querySelectorAll(s)].some(isVisible));
   const suspects=[...document.querySelectorAll('label,small,p,span,strong,button,option')]
    .filter(e=>e.children.length===0&&e.textContent.trim().length>5&&isVisible(e))
    .map(e=>({text:e.textContent.trim().slice(0,90),color:getComputedStyle(e).color,opacity:getComputedStyle(e).opacity,font:getComputedStyle(e).fontSize}))
    .filter(o=>{const m=o.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m&&Number(m[1])>150&&Number(m[2])>175&&Number(m[3])>175}).slice(0,20);
   return {shown,contrastCandidates:suspects,visibleText:document.body.innerText.slice(0,1500),scrollHeight:document.documentElement.scrollHeight,innerHeight};
  });
  // For long normal pages include a bottom shot. Popups keep their own scroll area.
  if(info.scrollHeight>info.innerHeight+160){
   await page.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);const x=document.querySelector('.content');if(x)x.scrollTop=x.scrollHeight;});
   await page.waitForTimeout(120);
   const below=prefix+'-bottom.png';await page.screenshot({path:join(root,below),animations:'disabled'});files.push(below);
  }
  manifest.tools.push({index:i+1,id,name,group,files,fixtures,info,errors,status:'captured'});
  console.log('CAPTURED',i+1,id,JSON.stringify({files,regions:info.shown,contrastCandidates:info.contrastCandidates.length}));
 }catch(e){
  errors.push(String(e));
  try{const failed=prefix+'-error.png';await page.screenshot({path:join(root,failed)});files.push(failed)}catch{}
  manifest.tools.push({index:i+1,id,name,group,files,fixtures,errors,status:'error'});
  console.log('ERROR',i+1,id,String(e).slice(0,200));
 }finally{await page.close()}
}
await context.close();await browser.close();
await writeFile(join(root,'manifest.json'),JSON.stringify(manifest,null,2));
console.log('ALL TOOLS REVIEW',JSON.stringify({total:specs.length,captured:manifest.tools.filter(x=>x.files.length>0).length,errors:manifest.tools.filter(x=>x.status==='error').map(x=>x.id)}));
