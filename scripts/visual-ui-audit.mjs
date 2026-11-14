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
  // Actual computed style must keep the version badge readable, not merely
  // set a foreground color that -webkit-text-fill-color later overrides.
  const versionBadge=await page.evaluate(()=>{
    const element=document.querySelector('.topbar .rivo-build-version');
    if(!element)return {visible:false,ink:''};
    const style=getComputedStyle(element),box=element.getBoundingClientRect();
    return {visible:box.width>0&&style.display!=='none'&&style.visibility!=='hidden',
      ink:style.webkitTextFillColor||style.color};
  });
  check(width+': build version badge uses readable navy ink',
    !versionBadge.visible||versionBadge.ink==='rgb(8, 39, 82)');

  // Verify the actual four Home actions fit: the legacy 320px row was
  // horizontally clipped with ~9px labels despite previous green tests.
  const shortcuts=await page.evaluate(()=>{
    const rail=document.querySelector('.rivo-feature-rail');
    const tiles=[...rail.querySelectorAll('.rivo-feature-tile')];
    const railRect=rail.getBoundingClientRect();
    const rects=tiles.map(tile=>{
      const box=tile.getBoundingClientRect();
      const label=tile.querySelector('strong');
      const text=label?.getBoundingClientRect();
      return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,
        labelHeight:text?.height||0,fontSize:parseFloat(getComputedStyle(label).fontSize),
        scrollHeight:label?.scrollHeight||0,clientHeight:label?.clientHeight||0};
    });
    return {count:rects.length,columns:getComputedStyle(rail).gridTemplateColumns.split(' ').filter(Boolean).length,
      fit:rects.every(x=>x.left>=railRect.left-2&&x.right<=railRect.right+2&&x.fontSize>=11&&
        x.labelHeight>12&&x.scrollHeight<=x.clientHeight+2),
      rows:new Set(rects.map(x=>Math.round(x.top))).size,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  check(width+': all Home shortcuts readable and completely visible',
    shortcuts.count===4&&shortcuts.fit&&!shortcuts.horizontalOverflow&&
    shortcuts.columns===4&&shortcuts.rows===1);
  check(width+': compact quick-actions reserve more space for documents',
    shortcuts.count===4&&shortcuts.fit&&shortcuts.rows===1);
  const onboarding=await page.locator('.rivo-onboarding .rivo-empty-scan').count();
  check(width+': first-run screen offers a functional primary scan action',onboarding===1);
  await page.screenshot({path:out+'/'+width+'-home-empty.png'});
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
  // Visual fixture only: native ad rendering requires an Android phone.
  const band=await page.evaluate(()=>{
   document.body.classList.add('rivo-has-ad-banner');
   const nav=document.querySelector('.mobilebar')?.getBoundingClientRect();
   document.documentElement.style.setProperty('--rivo-banner-bottom',Math.ceil(innerHeight-nav.top+8)+'px');
   const el=document.querySelector('.rivo-ad-banner-slot');
   const box=el?.getBoundingClientRect();
   const frame=el?.querySelector('.rivo-ad-banner-frame'),rect=frame?.getBoundingClientRect();
   if(frame)frame.textContent='320 × 50 TEST SLOT';
   return {exists:!!el,visible:!!box&&box.height>=50,
    centered:!!rect&&Math.abs(rect.left+rect.width/2-innerWidth/2)<4,
    fits:!!rect&&rect.width<=320&&rect.left>=-2&&rect.right<=innerWidth+2,
    aboveNav:!!box&&!!nav&&box.bottom<=nav.top-2,
    navAtBottom:!!nav&&Math.abs(nav.bottom-innerHeight)<3};
  });
  check(width+': 320x50 native banner sits above and clear of blue navigation',
   band.exists&&band.visible&&band.centered&&band.fits&&band.aboveNav&&band.navAtBottom);
  await page.screenshot({path:out+'/'+width+'-banner-test-slot.png'});
  await page.evaluate(()=>document.body.classList.remove('rivo-has-ad-banner'));

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
  check(width+': selection row fits',['rgb(255, 255, 255)','rgb(245, 250, 255)','rgb(233, 245, 251)'].includes(selection.background)&&selection.columns===6&&selection.fits&&selection.labelsVisible);
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
  check(width+': Tools grid is readable at responsive breakpoint',tools.grids.length>=2&&tools.grids.every(g=>g.display==='grid'&&g.columns===3));
  const toolLabelFit=await page.evaluate(()=>{
    const tiles=[...document.querySelectorAll('.rivo-hub-tile')];
    const ids=tiles.map(tile=>tile.dataset.hubAction);
    const clipped=tiles.filter(tile=>{
      const label=tile.querySelector('strong');
      if(!label)return true;
      const bounds=tile.getBoundingClientRect();
      const text=label.getBoundingClientRect();
      const style=getComputedStyle(label);
      return text.height<=1||text.bottom>bounds.bottom+2||
        style.webkitLineClamp==='2'||style.textOverflow==='ellipsis';
    }).map(tile=>tile.dataset.hubAction);
    return {tileCount:tiles.length,distinct:new Set(ids).size,clipped};
  });
  check(width+': all Tools card titles visible and not clipped',
   toolLabelFit.tileCount===19&&toolLabelFit.distinct===19&&toolLabelFit.clipped.length===0);
  const compactMetrics=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('.rivo-hub-tile')];
   const heights=cards.map(el=>el.getBoundingClientRect().height);
   const widths=cards.map(el=>el.getBoundingClientRect().width);
   return {count:cards.length,compact:heights.every(n=>n>=75&&n<150),
     widthsValid:widths.every(n=>n>40&&n<175),
     orbit:cards.every(el=>getComputedStyle(el,'::before').animationName==='rivo-orbit-border'),
     scanOrbit:getComputedStyle(document.querySelector('.rivo-nav-scan-ring'),'::before').animationName==='rivo-orbit-border'};
  });
  check(width+': compact Tools tiles and rotating edge and Smart Scan rings are present',
    compactMetrics.count===19&&compactMetrics.compact&&compactMetrics.widthsValid&&
    compactMetrics.orbit&&compactMetrics.scanOrbit);

  // Every tool tile is documented using its actual UI, without fake camera captures.
  if(width===393){
    for(const tile of await page.locator('.rivo-hub-tile').all()){
      const id=await tile.getAttribute('data-hub-action');
      await tile.scrollIntoViewIfNeeded();
      await page.screenshot({path:out+'/'+width+'-tool-'+id+'.png'});
    }
  }

  const navInfo=await page.evaluate(()=>{const bar=document.querySelector('.mobilebar'),scan=bar.querySelector('.rivo-nav-scan'),selected=bar.querySelector('button.active'),buttons=[...bar.querySelectorAll(':scope > button')];const b=bar.getBoundingClientRect(),s=scan.getBoundingClientRect(),style=getComputedStyle(bar);return {count:buttons.length,columns:style.gridTemplateColumns.split(' ').filter(Boolean).length,center:Math.abs((b.left+b.width/2)-(s.left+s.width/2))<3,dark:style.backgroundImage.includes('gradient')||style.backgroundColor==='rgb(8, 39, 82)',selected:!!selected&&getComputedStyle(selected).color==='rgb(0, 216, 255)',icons:buttons.every(x=>x.querySelector('svg')),bottom:b.bottom<=innerHeight+2,uncovered:document.querySelector('.floating-scan')?getComputedStyle(document.querySelector('.floating-scan')).display==='none':true};});
  check(width+': blue navbar five aligned positions; scanner center; active cyan',navInfo.count===5&&navInfo.columns===5&&navInfo.center&&navInfo.dark&&navInfo.selected&&navInfo.icons&&navInfo.bottom&&navInfo.uncovered);
  if(navInfo.count!==5||navInfo.columns!==5||!navInfo.center||!navInfo.dark||!navInfo.selected||!navInfo.icons||!navInfo.bottom||!navInfo.uncovered) console.warn('RivoScan navbar QA',width,JSON.stringify(navInfo));
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
    if(width===320){
     const saveRect=await overlay.locator('.rivo-code-actions button').last().evaluate(button=>button.getBoundingClientRect().toJSON());
     check(width+': Book Save fits short screen',saveRect.bottom<=height+2);
    }
   }
   await page.screenshot({path:out+'/'+width+'-'+tag+'.png'});
   await overlay.locator('[data-rivo-modal-close]').click();
   await overlay.waitFor({state:'detached',timeout:8000});
   check(width+': '+tag+' close works',await page.locator('[data-rivo-managed-modal="true"]').count()===0);
  }

  // Real PerfectScan initial state: no pale text, fake previews or empty advanced controls.
  await page.locator('.mobilebar [data-go="home"]').click();
  await page.locator('[data-rivo-feature="perfectScanQuality"]').click();
  const perfect=page.locator('.rivo-perfectscan-overlay');
  await perfect.waitFor({state:'visible',timeout:8000});
  const perfectInfo=await perfect.evaluate(root=>{
   const modal=root.querySelector('.rivo-perfectscan-modal');
   const small=modal.querySelector('header small');
   const bounds=modal.getBoundingClientRect();
   return {empty:!root.querySelector('.rivo-perfectscan-empty').hidden,
    addHidden:root.querySelector('[data-perfect="add"]').hidden,
    methodHidden:root.querySelector('.rivo-perfectscan-control').hidden,
    previewHidden:root.querySelector('.rivo-perfectscan-preview').hidden,
    cameraEnabled:!root.querySelector('[data-perfect="camera"]').disabled,
    hintReadable:getComputedStyle(small).color!=='rgb(184, 217, 242)'&&getComputedStyle(small).opacity==='1',
    fits:bounds.height<innerHeight*.93&&bounds.left>=-2&&bounds.right<=innerWidth+2};
  });
  check(width+': PerfectScan starts with readable source-photo choices',
   perfectInfo.empty&&perfectInfo.addHidden&&perfectInfo.methodHidden&&perfectInfo.previewHidden&&perfectInfo.cameraEnabled&&perfectInfo.hintReadable&&perfectInfo.fits);
  await page.screenshot({path:out+'/'+width+'-perfectscan-empty.png'});
  await perfect.locator('[data-perfect="close"]').click();
  await perfect.waitFor({state:'detached'});

  await page.locator('.mobilebar [data-tab="me"]').click();
  await page.locator('.app-settings').waitFor({state:'visible'});
  await page.screenshot({path:out+'/'+width+'-settings.png'});
  // Regression for the live-reported screen: no debug internals at the bottom
  // of consumer settings, but keep a visible privacy-choices entry point.
  const publicSettings=await page.evaluate(()=>{
   const settings=document.querySelector('.app-settings');
   return {diagnostics:!!settings?.querySelector('.rivo-ad-diagnostics'),
     privacy:!!settings?.querySelector('[data-ad-privacy]')};
  });
  check(width+': no developer AdMob diagnostics in consumer settings',!publicSettings.diagnostics);
  check(width+': privacy choices remain available',publicSettings.privacy);
  await page.locator('.settings-about').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/'+width+'-settings-bottom.png'});
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
