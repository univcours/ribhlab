/* Layout-only screenshots: the file names/pages here are DEMO FIXTURES,
 * never presented as real user documents or actual persisted thumbnails. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.RIVO_URL||'http://127.0.0.1:4173';
const output=process.env.RIVO_QA_DIR||'/tmp/rivo-04579-browser-qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [320,393]){
  const context=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,locale:'en-US'});
  await context.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.79'));
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#home-recents').waitFor({timeout:25000});
  await page.evaluate(()=>{
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="90" height="116"><rect x="1" y="1" width="88" height="114" rx="3" fill="#fcfdff" stroke="#aac4dd"/><text x="9" y="22" font-size="8" font-family="sans-serif" fill="#234e6d">SAMPLE PDF</text><path stroke="#9ab6ce" d="M9 35h72 M9 43h70 M9 51h60 M9 59h72 M9 67h66 M9 75h57 M9 83h70 M9 91h48"/></svg>';
   const thumb='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
   const icons={eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg>'};
   const fixture=['SAMPLE - Contract.pdf','SAMPLE - Invoice.pdf'].map((name,i)=>`
      <article class="recent-entry rivo-recent-card rivo-document-list-row" data-doc-open="${i}" role="button" tabindex="0">
       <input type="checkbox" class="doc-select-box rivo-recent-check" aria-label="Select sample"/>
       <span class="recent-file-icon rivo-file-thumb rivo-file-pdf"><img alt="" src="${thumb}"/><span class="rivo-file-kind-badge">PDF</span></span>
       <div class="recent-file-meta rivo-file-line">
        <div class="rivo-file-line-heading">
         <strong title="${name}">${name}</strong>
         <div class="rivo-row-inline-actions">
          <button type="button" aria-label="Open in another app">${icons.eye}</button>
          <button type="button" aria-label="Share">${icons.share}</button>
          <details class="rivo-row-more"><summary aria-label="More"><span>⋯</span></summary>
           <div class="rivo-row-more-panel"><button type="button">Rename</button><button type="button">Delete</button></div>
          </details>
         </div>
        </div><small>PDF · 223 KB · SAMPLE</small>
       </div>
      </article>`).join('');
   document.getElementById('home-recents').innerHTML=fixture;
   document.querySelector('#home-recents')?.scrollIntoView({block:'start'});
  });
  const layout=await page.evaluate(()=>{
   const rows=[...document.querySelectorAll('#home-recents>.rivo-document-list-row')];
   return rows.map(row=>{
    const title=row.querySelector('.rivo-file-line-heading>strong').getBoundingClientRect();
    const actions=row.querySelector('.rivo-row-inline-actions').getBoundingClientRect();
    const card=row.getBoundingClientRect();
    const thumb=row.querySelector('.rivo-file-thumb').getBoundingClientRect();
    return {sameLine:Math.abs((title.top+title.bottom)/2-(actions.top+actions.bottom)/2)<12,
     withinScreen:card.left>=-1&&card.right<=innerWidth+1&&actions.right<=card.right+2,
     visibleThumb:thumb.width>=48&&thumb.height>=65,
     actions:row.querySelectorAll('.rivo-row-inline-actions>button').length,
     titleWidth:title.width};
   });
  });
  assert.equal(layout.length,2);
  for(const row of layout){
   assert.ok(row.sameLine,'Filename and operations must be on same line');
   assert.ok(row.withinScreen,'All actions must fit screen');
   assert.ok(row.visibleThumb,'File page thumbnail must remain visible');
   assert.equal(row.actions,2);
   assert.ok(row.titleWidth>=20,'Filename must remain legible');
  }
  await page.screenshot({path:`${output}/${width}x852-sample-files-list.png`});
  results.push({width,rows:layout,fixture:'SAMPLE DOCUMENTS — NOT USER FILES'});
  await context.close();
 }
}finally{await browser.close()}
await writeFile(output+'/file-row-layout-results.json',JSON.stringify(results,null,2));
