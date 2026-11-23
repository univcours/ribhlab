/* Browser QA for responsive Home/Documents parity and functional PDF viewer buttons.
 * Sample documents are explicit fixtures, not real user files or Android camera proof. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_QA_DIR||'/tmp/rivo-04581-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const findings=[];
try{
 for(const width of [320,393]){
  const ctx=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,locale:'en-US'});
  await ctx.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.82'));
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#home-recents').waitFor({timeout:20000});
  const layouts={};
  for(const surface of ['home','documents']){
   if(surface==='documents'){
    await page.locator('[data-open-library]:visible').first().click({timeout:12000});
    await page.locator('#library-list').waitFor({timeout:12000});
   }
   const selector=surface==='home'?'#home-recents':'#library-list';
   await page.evaluate(selector=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect x="0" y="0" width="120" height="160" rx="3" fill="#fcfdff" stroke="#a7bdd0"/><text x="9" y="26" font-size="11" font-family="sans-serif" fill="#174467">SAMPLE PDF</text><path stroke="#afbed0" d="M10 43h98 M10 56h93 M10 69h98 M10 82h88 M10 95h93 M10 108h92 M10 121h98"/></svg>';
    const thumb='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
    const eye='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    document.querySelector(selector).innerHTML=['SAMPLE – First Scan.pdf','SAMPLE – Selected File.pdf'].map((name,i)=>`
     <article class="document-entry recent-entry rivo-recent-card ${i?'doc-selected':''}" data-doc-open="${i}" role="button" tabindex="0">
      <input type="checkbox" class="doc-select-box" aria-label="Select sample" ${i?'checked':''}/>
      <span class="document-icon rivo-file-thumb rivo-file-pdf"><img src="${thumb}" alt=""/></span>
      <div class="document-description"><strong title="${name}">${name}</strong><small>PDF · 4.4 MB · SAMPLE</small></div>
      ${i?`<div class="document-buttons rivo-file-quick-actions" role="group" aria-label="Actions">${Array.from({length:5},(_,n)=>`<button type="button" title="Action ${n+1}" aria-label="Action ${n+1}">${eye}</button>`).join('')}</div>`:''}
     </article>`).join('');
    document.querySelector(selector).scrollIntoView({block:'center'});
   },selector);
   await page.waitForTimeout(120);
   const values=await page.evaluate(selector=>[...document.querySelectorAll(selector+'>.document-entry')].map(row=>{
    const r=row.getBoundingClientRect(),t=row.querySelector('.rivo-file-thumb').getBoundingClientRect();
    const img=row.querySelector('.rivo-file-thumb img').getBoundingClientRect();
    const text=row.querySelector('.document-description').getBoundingClientRect();
    const actions=row.querySelector('.rivo-file-quick-actions');
    const a=actions?.getBoundingClientRect();
    const pad=1.7;
    return {
      rowBox:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height},
      thumbBox:{left:t.left,right:t.right,top:t.top,bottom:t.bottom,height:t.height},
      bounds:{row:[r.left,r.top,r.right,r.bottom],thumbnail:[t.left,t.top,t.right,t.bottom],rowHeight:r.height},
      style:{rowMinHeight:getComputedStyle(row).minHeight,rowPadding:getComputedStyle(row).padding,rowTransform:getComputedStyle(row).transform,thumbTransform:getComputedStyle(row.querySelector('.rivo-file-thumb')).transform},
      rowWithinScreen:r.left>=-pad&&r.right<=innerWidth+pad,
      thumbWithinRow:t.left>=r.left-pad&&t.right<=r.right+pad&&t.top>=r.top-pad&&t.bottom<=r.bottom+pad,
      imageWithinThumb:img.left>=t.left-pad&&img.right<=t.right+pad&&img.top>=t.top-pad&&img.bottom<=t.bottom+pad,
      textWithinRow:text.left>=r.left-pad&&text.right<=r.right+pad,
      actionsOnSameLine:!a||Math.abs((a.top+a.bottom)/2-(t.top+t.bottom)/2)<20,
      actionsWithinRow:!a||(a.left>=r.left-pad&&a.right<=r.right+pad&&a.top>=r.top-pad&&a.bottom<=r.bottom+pad),
      actionsScrollable:!a||actions.scrollWidth>actions.clientWidth,
      actionsCount:actions?.querySelectorAll('button').length||0,
      width:Math.round(t.width),height:Math.round(t.height),
      flex:getComputedStyle(row).display==='flex'&&getComputedStyle(row).flexWrap==='nowrap'
    };
   }),selector);
   console.log('[RivoScan 0.45.82 UI geometry]',JSON.stringify({surface,width,values}));
   await page.screenshot({path:`${out}/${width}x852-SAMPLE-${surface}-same-row-actions.png`});
   console.log('[04581 layout diagnostic]',width,surface,JSON.stringify(values));
   assert.equal(values.length,2);
   for(const v of values){
    for(const property of ['rowWithinScreen','thumbWithinRow','imageWithinThumb','textWithinRow','actionsOnSameLine','actionsWithinRow','flex'])
     assert.ok(v[property],surface+' '+width+'px '+property);
    assert.equal(v.width,width<=360?50:58,surface+' thumb width');
    assert.equal(v.height,width<=360?66:72,surface+' thumb height');
   }
   assert.equal(values[1].actionsCount,5);
   assert.equal(values[1].actionsScrollable,true,'All actions remain on the SAME row via horizontal scroll');
   await page.screenshot({path:`${out}/${width}x852-SAMPLE-${surface}-same-row-actions.png`});
   layouts[surface]=values;
  }
  assert.deepEqual(layouts.home.map(x=>[x.width,x.height,x.actionsCount]),layouts.documents.map(x=>[x.width,x.height,x.actionsCount]));
  findings.push({width,layouts});
  await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await ctx.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.82'));
 const page=await ctx.newPage();
 await page.goto('http://127.0.0.1:4174/',{waitUntil:'domcontentloaded'});
 const qa=await page.evaluate(async()=>{
  const {createDocumentViewer}=await import('/src/document-viewer.js');
  const tiny='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZ/QAAAABJRU5ErkJggg==';
  const calls={external:0,print:0,share:0,scan:0,edit:0,errors:[]};
  const bridge={
    readFile:async()=>({base64:tiny}),
    openFile:async()=>{calls.external++},
    printFile:async()=>{calls.print++},
    shareFile:async()=>{calls.share++},
    renameFile:async({name})=>({name}),
    deleteFile:async()=>{}
  };
  const viewer=createDocumentViewer({bridge,getLanguage:()=> 'en',onChanged:async()=>{},
    onEdit:async()=>{calls.edit++},onError:e=>calls.errors.push(e),
    onShare:async()=>{calls.share++},onAddScan:()=>{calls.scan++},getImageItems:()=>[]});
  await viewer.open({uri:'content://sample/document/1',name:'SAMPLE Document.png',mimeType:'image/png',size:512});
  const root=document.querySelector('.doc-detail-overlay');
  if(!root)throw Error('Viewer was not opened');
  if(!root.querySelector('.doc-zoom-in svg[data-phosphor-icon]'))throw Error('Zoom icon is not Phosphor');
  const more=root.querySelector('.doc-viewer-menu');
  more.click();
  const menu=root.querySelector('.doc-viewer-menu-panel');
  if(menu.hidden)throw Error('More menu did not open');
  const count=menu.querySelectorAll('button').length;
  if(count<5)throw Error('More menu missing real actions');
  menu.querySelector('button').click();
  await Promise.resolve();
  root.querySelector('.doc-external-open').click();await Promise.resolve();
  root.querySelector('.doc-zoom-in').click();
  more.click();
  const print=[...menu.querySelectorAll('button')].find(b=>b.textContent.includes('Print'));
  if(!print)throw Error('Print missing from More menu');
  print.click();await Promise.resolve();
  if(calls.external!==2||calls.print!==1)throw Error('Android external / print handlers did not execute');
  return {...calls,menuActions:count,phosphorIcons:root.querySelectorAll('svg[data-phosphor-icon]').length};
 });
 assert.ok(qa.phosphorIcons>=8);
 await page.screenshot({path:out+'/393x852-SAMPLE-document-preview-phosphor.png'});
 findings.push({viewer:qa});
 await ctx.close();
}finally{await browser.close()}
await writeFile(out+'/qa-04581-results.json',JSON.stringify(findings,null,2));
