/* Browser QA of all six fully-visible actions and no embedded document viewer.
 * Sample documents are explicit fixtures, not real user files or Android camera proof. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {materialSymbol} from '../src/material-symbols.js';
const url=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_QA_DIR||'/tmp/rivo-04581-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const findings=[];
const officialActionIcons=['external','shield','edges','share','pencil','trash'].map(name=>materialSymbol(name,18));
try{
 for(const width of [320,360,393,480]){
  const ctx=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,locale:'en-US'});
  await ctx.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.96'));
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#home-recents').waitFor({timeout:20000});
  const layouts={};
  for(const surface of ['home','documents']){
   if(surface==='documents'){
    await page.locator('[data-open-library]:visible').first().click({timeout:12000});
    await page.locator('#library-list').waitFor({timeout:12000});
    const importButton=page.locator('#app button[data-import="file"]');
    assert.equal(await importButton.count(),1,'Only one generic import control should remain');
    assert.equal(await importButton.getAttribute('aria-label'),'Import files','Generic import must not say Import images');
    assert.equal(await importButton.locator('.rivo-material-symbol[data-material-symbol="upload"]').count(),1,'Use Material upload icon');
   }
   const selector=surface==='home'?'#home-recents':'#library-list';
   await page.evaluate(({selector,actionIcons})=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect x="0" y="0" width="120" height="160" rx="3" fill="#fcfdff" stroke="#a7bdd0"/><text x="9" y="26" font-size="11" font-family="sans-serif" fill="#174467">SAMPLE PDF</text><path stroke="#afbed0" d="M10 43h98 M10 56h93 M10 69h98 M10 82h88 M10 95h93 M10 108h92 M10 121h98"/></svg>';
    const thumb='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
    document.querySelector(selector).innerHTML=['SAMPLE – First Scan.pdf','SAMPLE – Selected File.pdf'].map((name,i)=>`
     <article class="document-entry recent-entry rivo-recent-card ${i?'doc-selected':''}" data-doc-open="${i}" role="button" tabindex="0">
      <input type="checkbox" class="doc-select-box" aria-label="Select sample" ${i?'checked':''}/>
      <span class="document-icon rivo-file-thumb rivo-file-pdf"><img src="${thumb}" alt=""/></span>
      <div class="document-description"><strong title="${name}">${name}</strong><small>PDF · 4.4 MB · SAMPLE</small></div>
      ${i?`<div class="document-buttons rivo-file-quick-actions" role="group" aria-label="Actions">${Array.from({length:6},(_,n)=>`<button type="button" title="Action ${n+1}" aria-label="Action ${n+1}">${actionIcons[n]}</button>`).join('')}</div>`:''}
     </article>`).join('');
    document.querySelector(selector).scrollIntoView({block:'center'});
   },{selector,actionIcons:officialActionIcons});
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
       everyButtonWithinRow:!actions||[...actions.querySelectorAll('button')].every(button=>{
         const b=button.getBoundingClientRect();
         return b.left>=r.left-pad&&b.right<=r.right+pad&&b.top>=r.top-pad&&b.bottom<=r.bottom+pad;
       }),
       everyIconInsideButton:!actions||[...actions.querySelectorAll('button')].every(button=>{
         const b=button.getBoundingClientRect(),icon=button.querySelector('.rivo-material-symbol[data-material-symbol]');
         if(!icon)return false;
         const p=icon.getBoundingClientRect();
         return p.left>=b.left-pad&&p.right<=b.right+pad&&p.top>=b.top-pad&&p.bottom<=b.bottom+pad;
       }),
       // Material glyph ink may add a few scrollWidth pixels even when
       // overflow is VISIBLE (not scrollable). Validate actual button rectangles
       // inside the action grid instead, plus reject true x-scrolling/clipping.
       allButtonsVisible:!actions||(
         !['auto','scroll','hidden','clip'].includes(getComputedStyle(actions).overflowX)&&
         [...actions.querySelectorAll('button')].every(button=>{
           const b=button.getBoundingClientRect();
           return b.left>=a.left-pad&&b.right<=a.right+pad&&
             b.top>=a.top-pad&&b.bottom<=a.bottom+pad&&
             b.width>=26&&b.height>=28&&
             getComputedStyle(button).display!=='none'&&
             getComputedStyle(button).visibility!=='hidden';
         })
       ),
      width:Math.round(t.width),height:Math.round(t.height),
      flex:getComputedStyle(row).display==='flex'&&getComputedStyle(row).flexWrap==='nowrap'
    };
   }),selector);
   console.log('[RivoScan 0.45.96 UI geometry]',JSON.stringify({surface,width,values}));
   await page.screenshot({path:`${out}/${width}x852-SAMPLE-${surface}-same-row-actions.png`});
   console.log('[04581 layout diagnostic]',width,surface,JSON.stringify(values));
   assert.equal(values.length,2);
   for(const v of values){
    for(const property of ['rowWithinScreen','thumbWithinRow','imageWithinThumb','textWithinRow','actionsOnSameLine','actionsWithinRow','everyButtonWithinRow','everyIconInsideButton','allButtonsVisible','flex'])
     assert.ok(v[property],surface+' '+width+'px '+property);
    assert.equal(v.width,width<=360?50:58,surface+' thumb width');
    assert.equal(v.height,width<=360?66:72,surface+' thumb height');
   }
   assert.equal(values[1].actionsCount,6);
   assert.ok(values[1].allButtonsVisible,'All six icons must be visible and never clipped');
   await page.screenshot({path:`${out}/${width}x852-SAMPLE-${surface}-same-row-actions.png`});
   layouts[surface]=values;
  }
  assert.deepEqual(layouts.home.map(x=>[x.width,x.height,x.actionsCount]),layouts.documents.map(x=>[x.width,x.height,x.actionsCount]));
  findings.push({width,layouts});
  await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await ctx.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.96'));
 const page=await ctx.newPage();
 await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.doc-detail-overlay, .doc-viewer-menu-panel').count(),0,
   'Obsolete in-app document viewer and its More/Zoom windows must not appear');
 findings.push({externalViewerOnly:true,embeddedViewerCount:0});
 await ctx.close();
}finally{await browser.close()}
await writeFile(out+'/qa-04581-results.json',JSON.stringify(findings,null,2));
