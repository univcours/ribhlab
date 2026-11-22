/* Accurate layout QA on My Documents (0.45.44 flex layout + 0.45.79 thumbnails).
 * The two sample pages are explicit test fixtures; not user-owned documents.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_QA_DIR||'/tmp/rivo-04580-browser-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [320,393]){
  const ctx=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,locale:'en-US'});
  await ctx.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.80'));
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('[data-open-library]:visible').first().click({timeout:20000});
  await page.locator('#library-list').waitFor({timeout:20000});
  await page.evaluate(()=>{
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect x="1" y="1" width="118" height="158" fill="#fcfdff" stroke="#aac4dd"/><text x="9" y="24" font-size="10" font-family="sans-serif" fill="#234e6d">SAMPLE PDF</text><path stroke="#9ab6ce" d="M9 39h98 M9 51h92 M9 63h98 M9 75h86 M9 87h95 M9 99h89 M9 111h97 M9 123h83 M9 135h90"/></svg>';
   const thumb='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
   const eye='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
   const rows=['SAMPLE – First Page.pdf','SAMPLE – Selected Document.pdf'].map((name,i)=>`
     <article class="document-entry ${i===1?'doc-selected':''}" data-doc-open="${i}" role="button" tabindex="0">
      <input type="checkbox" class="doc-select-box" aria-label="Select sample" ${i===1?'checked':''}/>
      <span class="document-icon rivo-file-thumb rivo-file-pdf" aria-hidden="true"><img src="${thumb}" alt=""/></span>
      <div class="document-description"><strong title="${name}">${name}</strong><small>PDF · 223 KB · SAMPLE</small></div>
      ${i===1?`<div class="document-buttons rivo-file-quick-actions">${Array.from({length:6},(_,n)=>`<button type="button" aria-label="Action ${n+1}">${eye}</button>`).join('')}</div>`:''}
     </article>`).join('');
   document.querySelector('#library-list').innerHTML=rows;
   document.querySelector('#library-list').scrollIntoView({block:'center'});
  });
  await page.waitForTimeout(100);
  const measurements=await page.evaluate(()=>[...document.querySelectorAll('#library-list>.document-entry')].map(row=>{
   const r=row.getBoundingClientRect(),frame=row.querySelector('.rivo-file-thumb').getBoundingClientRect(),
    img=row.querySelector('.rivo-file-thumb img').getBoundingClientRect(),
    title=row.querySelector('.document-description').getBoundingClientRect();
   const actions=[...row.querySelectorAll('.rivo-file-quick-actions button')].map(b=>b.getBoundingClientRect());
   const computed=getComputedStyle(row);
   const eps=1.5;
   return {
    display:computed.display,flexDirection:computed.flexDirection,
    rowWithinViewport:r.left>=-eps&&r.right<=innerWidth+eps,
    thumbInsideRow:frame.left>=r.left-eps&&frame.right<=r.right+eps&&frame.top>=r.top-eps&&frame.bottom<=r.bottom+eps,
    imageInsideThumb:img.left>=frame.left-eps&&img.right<=frame.right+eps&&img.top>=frame.top-eps&&img.bottom<=frame.bottom+eps,
    titleWithinRow:title.left>=r.left-eps&&title.right<=r.right+eps,
    thumbWidth:Math.round(frame.width),thumbHeight:Math.round(frame.height),
    actionsInsideRow:actions.every(b=>b.left>=r.left-eps&&b.right<=r.right+eps&&b.top>=r.top-eps&&b.bottom<=r.bottom+eps),
    actionsCount:actions.length,inlineActions:row.querySelectorAll('.rivo-row-inline-actions').length
   };
  }));
  assert.equal(measurements.length,2);
  for(const m of measurements){
   assert.equal(m.display,'flex','0.45.44 layout is flex, not the 0.45.78 grid');
   assert.equal(m.flexDirection,'row');
   assert.ok(m.rowWithinViewport,'Document card must not exit viewport');
   assert.ok(m.thumbInsideRow,'Thumbnail must stay inside its own card');
   assert.ok(m.imageInsideThumb,'Page image must not extend beyond thumbnail frame');
   assert.ok(m.titleWithinRow,'File name must stay inside card');
   assert.ok(m.actionsInsideRow,'Selected-file buttons must stay inside card');
   assert.equal(m.inlineActions,0,'No 0.45.79 inline cluster');
   assert.equal(m.thumbWidth,width<=360?50:58,'Keep current width');
   assert.equal(m.thumbHeight,width<=360?66:72,'Keep current height');
  }
  assert.equal(measurements[1].actionsCount,6);
  await page.screenshot({path:`${out}/${width}x852-SAMPLE-0.45.44-My-Documents-Current-Thumbnails.png`});
  results.push({viewport:width,files:'SAMPLE fixtures (not actual user files)',rows:measurements});
  await ctx.close();
 }
}finally{await browser.close()}
await writeFile(out+'/mydocs-04544-layout-results.json',JSON.stringify(results,null,2));
