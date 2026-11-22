/* Browser presentation QA only. SAMPLE entries are fixtures, never user files. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_QA_DIR||'/tmp/rivo-04580-browser-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const rows=[];
try{
 for(const width of [320,393]){
  const context=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,locale:'en-US'});
  await context.addInitScript(()=>localStorage.setItem('rivo-release-notes-read','0.45.80'));
  const page=await context.newPage();
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#home-recents').waitFor({timeout:25000});
  await page.evaluate(()=>{
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect x="1" y="1" width="118" height="158" rx="3" fill="#fcfdff" stroke="#aac4dd"/><text x="9" y="23" font-size="10" font-family="sans-serif" fill="#234e6d">SAMPLE PDF</text><path stroke="#9ab6ce" d="M9 39h98 M9 50h95 M9 61h91 M9 72h98 M9 83h90 M9 94h97 M9 105h91 M9 116h90 M9 127h97"/></svg>';
   const thumb='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
   const eye='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
   const html=['SAMPLE - Contract.pdf','SAMPLE - Invoice.pdf'].map((name,i)=>`
     <article class="recent-entry rivo-recent-card" data-doc-open="${i}" role="button" tabindex="0">
      <input class="doc-select-box rivo-recent-check" type="checkbox" aria-label="Select sample"/>
      <span class="recent-file-icon rivo-file-thumb rivo-file-pdf" aria-hidden="true"><img src="${thumb}" alt=""/><span class="rivo-file-kind-badge">PDF</span></span>
      <div class="recent-file-meta"><strong title="${name}">${name}</strong><small>PDF · 223 KB · SAMPLE</small></div>
      <span class="rivo-list-open-glyph" aria-hidden="true">${eye}</span>
     </article>`).join('');
   document.querySelector('#home-recents').innerHTML=html;
   document.querySelector('#home-recents').scrollIntoView({block:'start'});
  });
  const visible=await page.evaluate(()=>[...document.querySelectorAll('#home-recents>.rivo-recent-card')].map(row=>{
   const r=row.getBoundingClientRect(),t=row.querySelector('.rivo-file-thumb').getBoundingClientRect();
   const title=row.querySelector('.recent-file-meta>strong').getBoundingClientRect();
   const glyph=row.querySelector('.rivo-list-open-glyph').getBoundingClientRect();
   const styles=getComputedStyle(row);
   return {width:r.width,thumbWidth:t.width,thumbHeight:t.height,titleWidth:title.width,
    sameRow:Math.abs((t.top+t.bottom)/2-(title.top+title.bottom)/2)<35,
    oldLayout:styles.display==='grid'&&styles.gridTemplateColumns.split(' ').length===4,
    noInlineActions:row.querySelectorAll('.rivo-row-inline-actions').length===0,
    withinViewport:r.left>=-1&&r.right<=innerWidth+1&&glyph.right<=r.right+1,
    hasRealImageNode:!!row.querySelector('.rivo-file-thumb img')};
  }));
  assert.equal(visible.length,2);
  for(const e of visible){
   assert.ok(e.oldLayout,'Old four-column file layout must return');
   assert.ok(e.noInlineActions,'Inline 0.45.79 action cluster must be removed');
   assert.ok(e.withinViewport,'File row must fit phone');
   assert.ok(e.sameRow,'Thumbnail and document title must align');
   assert.ok(e.thumbWidth>=49&&e.thumbHeight>=65,'New thumbnail shape must remain');
   assert.ok(e.titleWidth>=35,'Filename cannot disappear');
   assert.ok(e.hasRealImageNode,'Page thumbnail remains displayed');
  }
  await page.screenshot({path:`${out}/${width}x852-SAMPLE-old-list-new-thumbnails.png`});
  rows.push({viewport:width,source:'SAMPLE DOCUMENTS, not user documents',layout:visible});
  await context.close();
 }
}finally{await browser.close()}
await writeFile(out+'/restore-list-results.json',JSON.stringify(rows,null,2));
