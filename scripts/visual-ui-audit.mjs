// Real RivoScan UI rendering audit with clearly labeled TEST documents.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const out=process.env.RIVO_VISUAL_OUTPUT||'/tmp/rivoscan-visual-ui';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const appVersion=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const report={title:`RivoScan ${appVersion} responsive UI regressions`,checks:[],failures:[],screens:[]};
const check=(name,ok)=>{report.checks.push({name,ok:!!ok});if(!ok)report.failures.push(name)};
try{
 for(const width of [320,360,393,412]){
  const height=width===320?640:width===360?800:width===393?873:915;
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await ctx.addInitScript(version=>{localStorage.setItem('rivo-language','en');localStorage.setItem('rivo-release-notes-read',version)},appVersion);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'networkidle',timeout:35000});
  await page.locator('.rivo-compact-home').waitFor({timeout:20000});
  // Test fixtures provide metadata/thumbnail slots without accessing private user files.
  const home=await page.evaluate(()=>{
    const doc=name=>'<article class="recent-entry rivo-recent-card" role="button">'+
     '<input type="checkbox" class="doc-select-box rivo-recent-check" aria-label="Select"/>'+
     '<span class="recent-file-icon rivo-file-thumb rivo-file-pdf"><span>PDF</span></span>'+
     '<div class="recent-file-meta"><strong>'+name+'</strong><small>1.2 MB</small></div></article>';
    const list=document.getElementById('home-recents');
    list.innerHTML=['Invoice_2026.pdf','Contract_2026.pdf','Receipt_2026.pdf'].map(doc).join('');
    const items=[...list.querySelectorAll('.rivo-recent-card')],name=items[0].querySelector('strong');
    return {display:getComputedStyle(list).display,direction:getComputedStyle(list).flexDirection,
     firstRow:getComputedStyle(items[0]).display,
     width:items[0].getBoundingClientRect().width,
     sameX:Math.abs(items[0].getBoundingClientRect().x-items[1].getBoundingClientRect().x)<2,
     stacked:items[1].getBoundingClientRect().y>=items[0].getBoundingClientRect().bottom,
     nameWidth:name.getBoundingClientRect().width,
     visible:getComputedStyle(name).visibility==='visible'};
  });
  check(width+': Home is vertical list',home.display==='flex'&&home.direction==='column');
  check(width+': each row is full-width horizontal',home.firstRow==='flex'&&home.width>width*.7);
  check(width+': rows stack below each other',home.sameX&&home.stacked);
  check(width+': filenames are visible and not width zero',home.nameWidth>65&&home.visible);
  await page.screenshot({path:out+'/'+width+'-home-test-fixture.png'});
  await page.locator('.mobilebar [data-open-library]').click();
  await page.locator('.library-workspace').waitFor({state:'visible'});
  const library=await page.evaluate(()=>{
   const root=document.getElementById('library-list');
   const doc=name=>'<article class="document-entry">'+
    '<span class="document-icon rivo-file-thumb"><span>PDF</span></span>'+
    '<div class="document-description"><strong>'+name+'</strong><small>1.1 MB</small></div></article>';
   root.innerHTML=['Legal_Document_2026.pdf','Second_Document.pdf'].map(doc).join('');
   const rows=[...root.querySelectorAll('.document-entry')];
   return {display:getComputedStyle(root).display,direction:getComputedStyle(root).flexDirection,
    sameX:Math.abs(rows[0].getBoundingClientRect().x-rows[1].getBoundingClientRect().x)<2,
    stacked:rows[1].getBoundingClientRect().y>=rows[0].getBoundingClientRect().bottom,
    nameWidth:rows[0].querySelector('strong').getBoundingClientRect().width,
    gridToggle:!!document.getElementById('library-layout')};
  });
  check(width+': Documents one-column vertical list',library.display==='flex'&&library.direction==='column'&&library.sameX&&library.stacked);
  check(width+': Documents names readable, no grid toggle',library.nameWidth>65&&!library.gridToggle);
  await page.screenshot({path:out+'/'+width+'-documents-test-fixture.png'});

  // Responsive TEST fixture: approved icon/label toolbar, not a camera result.
  const selection=await page.evaluate(()=>{
    const slot=document.getElementById('library-selection-root');
    const names=['Cancel','All','Delete','Move','Merge','Share'];
    slot.innerHTML='<div class="library-selection-toolbar rivo-compact-selection" role="toolbar"><div class="rivo-inline-bulk">'+
      names.map(name=>'<button type="button" data-bulk="'+name.toLowerCase()+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/></svg><span class="rivo-action-label">'+name+'</span></button>').join('')+'</div></div>';
    const bar=slot.querySelector('.rivo-compact-selection'),rail=bar.querySelector('.rivo-inline-bulk');
    const buttons=[...rail.querySelectorAll('button')],box=bar.getBoundingClientRect();
    return {order:buttons.map(b=>b.innerText.trim()),background:getComputedStyle(bar).backgroundColor,
      columns:getComputedStyle(rail).gridTemplateColumns.split(' ').filter(Boolean).length,
      fits:box.left>=-3&&box.right<=innerWidth+3,
      labelsVisible:buttons.every(b=>getComputedStyle(b.querySelector('span')).display!=='none')};
  });
  check(width+': selection order',selection.order.join('|')==='Cancel|All|Delete|Move|Merge|Share');
  check(width+': selection row fits',selection.background==='rgb(255, 255, 255)'&&selection.columns===6&&selection.fits&&selection.labelsVisible);
  await page.screenshot({path:out+'/'+width+'-selection-test-fixture.png'});
  await page.evaluate(()=>{document.getElementById('library-selection-root').innerHTML='';});

  await page.locator('.mobilebar [data-tab="tools"]').click();
  await page.locator('.rivo-tools-hub').waitFor({state:'visible'});
  const tools=await page.evaluate(()=>({
   categoryTabs:document.querySelectorAll('.rivo-tool-pills').length,
   grids:[...document.querySelectorAll('.rivo-hub-grid')].map(g=>({
    display:getComputedStyle(g).display,
    columns:getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length,
    count:g.querySelectorAll(':scope > .rivo-hub-tile').length}))
  }));
  check(width+': no obsolete category tabs',tools.categoryTabs===0);
  check(width+': Tools grid is exactly 3 columns',tools.grids.length>=2&&tools.grids.every(g=>g.display==='grid'&&g.columns===3));
  await page.screenshot({path:out+'/'+width+'-tools.png'});

  // Real utility dialogs (not mocked modals): detect clipping and missing Close.
  for(const [id,tag] of [['bookScan','book-scan'],['formulaOcr','formula-ocr'],
    ['photoTranslation','photo-translation'],['idPhotoMaker','id-photo']]){
   const tile=page.locator('[data-hub-action="'+id+'"]').first();
   check(width+': '+tag+' tool exists',await tile.count()>0);
   if(!(await tile.count()))continue;
   await tile.click();
   const overlay=page.locator('[data-rivo-managed-modal="true"]').last();
   await overlay.waitFor({state:'visible',timeout:10000});
   const info=await overlay.evaluate(root=>{
    const panel=root.querySelector('[role="dialog"]'),close=root.querySelector('[data-rivo-modal-close]');
    const buttons=[...root.querySelectorAll('.rivo-code-actions > button')];
    const bounds=panel.getBoundingClientRect();
    return {close:!!close&&close.getBoundingClientRect().width>=40,
     fits:bounds.left>=-2&&bounds.right<=innerWidth+2,
     clipped:buttons.some(button=>{
      const r=button.getBoundingClientRect();
      return r.right>bounds.right+2||r.left<bounds.left-2||button.scrollWidth>button.clientWidth+5;
     })};
   });
   check(width+': '+tag+' visible close',info.close);
   check(width+': '+tag+' fits viewport',info.fits);
   check(width+': '+tag+' buttons not clipped',!info.clipped);
   if(id==='bookScan'){
    check(width+': book advanced corrections collapsed',
     await overlay.locator('details.rivo-book-advanced:not([open])').count()===1);
    check(width+': Book Save disabled without photo',
     await overlay.locator('.rivo-code-actions button').last().isDisabled());
   }
   await page.screenshot({path:out+'/'+width+'-'+tag+'.png'});
   await overlay.locator('[data-rivo-modal-close]').click();
   await overlay.waitFor({state:'detached',timeout:8000});
   check(width+': '+tag+' close works',await page.locator('[data-rivo-managed-modal="true"]').count()===0);
  }

  await page.locator('.mobilebar [data-tab="me"]').click();
  await page.locator('.app-settings').waitFor({state:'visible'});
  await page.screenshot({path:out+'/'+width+'-settings.png'});
  const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,ww:window.innerWidth}));
  check(width+': no horizontal page-level overflow',overflow.sw<=overflow.ww+3);
  check(width+': no uncaught JS errors',errors.length===0);
  report.screens.push({width,height,home,library,tools,overflow,errors});
  await ctx.close();
 }
}finally{
 await browser.close();
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
}
console.log(JSON.stringify({checks:report.checks.length,failures:report.failures,
 screenshots:report.screens.length*5},null,2));
assert.equal(report.failures.length,0,'RivoScan UI responsive test failed');
