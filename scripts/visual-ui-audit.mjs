// Real RivoScan UI rendering audit with clearly labeled TEST documents.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {toolGroups} from '../src/tools-hub.js';
const out=process.env.RIVO_VISUAL_OUTPUT||'/tmp/rivoscan-visual-ui';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const appVersion=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const expectedTools=toolGroups.flatMap(group=>group.entries);
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
  // A search field must stay directly beside its page title, not below it.
  const searchSameRow=async(titleSelector,searchSelector)=>{
    return page.evaluate(([titleSelector,searchSelector])=>{
      const heading=document.querySelector(titleSelector),search=document.querySelector(searchSelector);
      if(!heading||!search)return {ok:false,reason:'missing heading/search'};
      const a=heading.getBoundingClientRect(),b=search.getBoundingClientRect();
      const center=r=>(r.top+r.bottom)/2;
      return {ok:a.width>18&&b.width>75&&
        Math.abs(center(a)-center(b))<8&&a.right<=b.left+4&&
        b.right<=innerWidth+2&&a.left>=-2&&
        getComputedStyle(search).display!=='none',
        title:{x:a.x,y:a.y,w:a.width},search:{x:b.x,y:b.y,w:b.width}};
    },[titleSelector,searchSelector]);
  };
  const homeSearch=await searchSameRow('.rivo-home-search-title-row .rivo-home-intro h1','.rivo-home-search-title-row .rivo-premium-search');
  check(width+': My Files heading and Search documents in the same row',homeSearch.ok);
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

  // Every app page must use ONE 320x50 native reservation above the fixed nav.
  // This verifies only geometry; an actual AdMob tap needs Android hardware.
  for(const [name,selector] of [
   ['home','.mobilebar [data-go="home"]'],
   ['documents','.mobilebar [data-open-library]'],
   ['tools','.mobilebar [data-tab="tools"]'],
   ['me','.mobilebar [data-tab="me"]']
  ]){
   await page.locator(selector).click();
   const fit=await page.evaluate(()=>{
    document.body.classList.add('rivo-has-ad-banner');
    const nav=document.querySelector('.mobilebar').getBoundingClientRect();
    const margin=Math.ceil(innerHeight-nav.top)+8;
    document.documentElement.style.setProperty('--rivo-banner-bottom',margin+'px');
    const el=document.querySelector('.rivo-ad-banner-slot');
    const box=el.getBoundingClientRect(),inner=el.querySelector('.rivo-ad-banner-frame').getBoundingClientRect();
    const okay=box.width===320&&box.height===50&&inner.width===320&&
     box.left>=-1&&box.right<=innerWidth+1&&
     Math.abs(box.left+box.width/2-innerWidth/2)<2&&
     Math.abs(box.bottom-(innerHeight-margin))<2&&
     box.bottom<=nav.top-7&&getComputedStyle(el).pointerEvents==='none';
    document.body.classList.remove('rivo-has-ad-banner');
    return okay;
   });
   check(width+': '+name+' 320x50 ad slot centered, nav unobstructed, native tap possible',fit);
  }
  await page.locator('.mobilebar [data-go="home"]').click();

  await page.locator('.mobilebar [data-open-library]').click();
  await page.locator('.library-workspace').waitFor({state:'visible'});
  const library=await page.evaluate(()=>{
   const root=document.getElementById('library-list');
   const doc=name=>'<article class="document-entry">'+
    '<span class="document-icon rivo-file-thumb"><span>PDF</span></span>'+
    '<div class="document-description"><strong>'+name+'</strong><small>1.1 MB</small></div></article>';
   root.innerHTML=['Legal_Document_2026.pdf','Second_Document.pdf'].map(doc).join('');
   const counter=document.querySelector('.library-top strong');
   if(counter)counter.textContent='2 TEST FILES';
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

  const docsInline=await page.evaluate(()=>{
    const row=document.querySelector('.library-workspace .rivo-library-title-search');
    const heading=row?.querySelector('h1'),search=row?.querySelector('.library-search');
    const actions=document.querySelector('.library-workspace .library-heading-actions');
    const importButton=actions?.querySelector('[data-import="file"]');
    const folder=actions?.querySelector('#open-storage-folder');
    const refresh=actions?.querySelector('#refresh-documents');
    if(!row||!heading||!search||!importButton||!folder||!refresh)return false;
    const a=heading.getBoundingClientRect(),b=search.getBoundingClientRect();
    const button=importButton.getBoundingClientRect();
    return a.right<=b.left+6&&Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<9&&
      b.width>80&&b.right<=innerWidth+2&&
      button.width>44&&
      document.querySelectorAll('.library-workspace [data-import]').length===1&&
      !document.querySelector('.library-workspace .storage-actions')&&
      !document.querySelector('.library-workspace .rivo-library-command-row');
  });
  check(width+': My Documents title and search share one row, single Import for all file types',docsInline);
  await page.screenshot({path:out+'/'+width+'-documents-title-search.png'});
  // Responsive TEST fixture: six REAL SVG shapes from the file action toolbar,
  // not placeholder black squares. All labels and sample documents are test data.
  const selection=await page.evaluate(()=>{
    const slot=document.getElementById('library-selection-root');
    const names=['Cancel','All','Delete','Move','Merge','Share'];
    const paths={
      Cancel:'<path d="M5 5l14 14M19 5 5 19"/>',
      All:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3.5 3.5L17 9"/>',
      Delete:'<path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7"/>',
      Move:'<path d="M3 7h6l2 2h10v11H3z"/><path d="m12 12 3 3-3 3m-4-3h7"/>',
      Merge:'<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M9 9h11v11H9z"/>',
      Share:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>'
    };
    const actions=names.map(name=>'<button type="button" data-bulk="'+name.toLowerCase()+'">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>'+
      '<span class="rivo-action-label">'+name+'</span></button>').join('');
    slot.innerHTML='<div class="library-selection-toolbar rivo-compact-selection" role="toolbar"><span class="rivo-selection-count">2 selected</span><div class="rivo-inline-bulk">'+actions+'</div></div>';
    document.querySelectorAll('#library-list .document-entry').forEach(row=>{
      const checkbox=document.createElement('input');
      checkbox.type='checkbox';checkbox.className='doc-select-box';checkbox.checked=true;
      checkbox.setAttribute('aria-label','Test document selected');
      row.prepend(checkbox);
    });
    const bar=slot.querySelector('.rivo-compact-selection'),rail=bar.querySelector('.rivo-inline-bulk');
    const buttons=[...rail.querySelectorAll('button')],box=bar.getBoundingClientRect();
    return {order:buttons.map(b=>b.innerText.trim()),background:getComputedStyle(bar).backgroundColor,
      columns:getComputedStyle(rail).gridTemplateColumns.split(' ').filter(Boolean).length,
      fits:box.left>=-3&&box.right<=innerWidth+3,
      labelsVisible:buttons.every(b=>getComputedStyle(b.querySelector('span')).display!=='none'),
      realIcons:buttons.every(b=>b.querySelector('svg path')&&b.querySelector('svg').getAttribute('fill')==='none')};
  });
  check(width+': selection order',selection.order.join('|')==='Cancel|All|Delete|Move|Merge|Share');
  check(width+': selection row fits',['rgb(255, 255, 255)','rgb(245, 250, 255)','rgb(233, 245, 251)'].includes(selection.background)&&selection.columns===6&&selection.fits&&selection.labelsVisible&&selection.realIcons);
  await page.screenshot({path:out+'/'+width+'-selection-test-fixture.png'});
  const singleSelection=await page.evaluate(()=>{
    const boxes=document.querySelectorAll('#library-list .doc-select-box');
    boxes[1].checked=false;
    // With one selected document NO bulk bar appears. Its own correction
    // button is next to individual actions, not in a group toolbar.
    document.getElementById('library-selection-root').innerHTML='';
    const row=boxes[0].closest('.document-entry');
    const action=document.createElement('button');
    action.type='button';action.dataset.docEdges='0';action.textContent='Readjust edges';
    action.setAttribute('aria-label','Readjust edges');
    const buttons=document.createElement('div');buttons.className='rivo-file-quick-actions';
    buttons.append(action);row.append(buttons);
    return boxes[0].checked&&!boxes[1].checked&&
      !document.querySelector('#library-selection-root .rivo-compact-selection')&&
      !!row.querySelector('[data-doc-edges]');
  });
  check(width+': single file has edge action and no bulk toolbar',singleSelection);
  await page.screenshot({path:out+'/'+width+'-selection-single-test-fixture.png'});
  await page.evaluate(()=>{
    document.getElementById('library-selection-root').innerHTML='';
    document.querySelectorAll('#library-list .doc-select-box').forEach(x=>x.remove());
  });

  await page.locator('.mobilebar [data-tab="tools"]').click();
  await page.locator('.rivo-tools-hub').waitFor({state:'visible'});
  const toolsInline=await searchSameRow('.rivo-tools-search-title-row .rivo-tools-heading h1','.rivo-tools-search-title-row .rivo-tools-search');
  check(width+': Tools heading and Search tools in the same row',toolsInline.ok);
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
    return {ids,clipped};
  });
  check(width+': all Tools card titles visible and not clipped',
   toolLabelFit.ids.length===expectedTools.length&&expectedTools.every(id=>toolLabelFit.ids.includes(id))&&toolLabelFit.clipped.length===0);
  const compactMetrics=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('.rivo-hub-tile')];
   const heights=cards.map(el=>el.getBoundingClientRect().height);
   const widths=cards.map(el=>el.getBoundingClientRect().width);
   return {count:cards.length,compact:heights.every(n=>n>=75&&n<150),
     widthsValid:widths.every(n=>n>40&&n<175),
     orbit:cards.every(el=>getComputedStyle(el,'::before').animationName==='none'),
     scanOrbit:getComputedStyle(document.querySelector('.rivo-nav-scan-ring'),'::before').animationName==='rivo-orbit-border'};
  });
  check(width+': compact Tools tiles keep quiet edges and rotating Smart Scan ring',
    compactMetrics.count===expectedTools.length&&compactMetrics.compact&&compactMetrics.widthsValid&&
    compactMetrics.orbit&&compactMetrics.scanOrbit);
  await page.locator('.rivo-hub-tile').first().focus();
  const focusedOrbit=await page.locator('.rivo-hub-tile').first().evaluate(el=>
    getComputedStyle(el,'::before').animationName==='rivo-orbit-border');
  check(width+': focused tool gets a moving blue edge',focusedOrbit);

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
  const inactiveInk=await page.locator('.mobilebar button:not(.active)').first().evaluate(el=>getComputedStyle(el).webkitTextFillColor);
  check(width+': inactive navigation label is readable on navy',inactiveInk==='rgb(245, 250, 255)');
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
    // Only the active contextual settings panel contributes visible buttons.
    // Hidden task panels must not be mistaken for clipped controls.
    const buttons=[...root.querySelectorAll('.rivo-code-actions > button')]
     .filter(button=>button.getClientRects().length>0&&getComputedStyle(button).visibility!=='hidden');
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
    const bookContext=await overlay.evaluate(root=>{
     const panel=root.querySelector('.rivo-book-dialog');
     const gear=panel?.querySelector('.rivo-workspace-settings-toggle');
     const drawer=panel?.querySelector('.rivo-workspace-settings');
     const source=panel?.querySelector('[data-book-panel="source"]');
     const split=panel?.querySelector('[data-book-panel="split"]');
     const flatten=panel?.querySelector('[data-book-panel="flatten"]');
     return !!gear&&gear.getAttribute('aria-expanded')==='true'&&
      !!drawer&&!drawer.hidden&&!!source&&!source.hidden&&
      !!flatten&&flatten.hidden&&(!split||split.hidden);
    });
    check(width+': book source-only settings, advanced corrections behind gear',bookContext);
    const bookSave=overlay.locator('.rivo-book-dialog .rivo-edit-bottom-bar button').last();
    check(width+': Book Save disabled without photo',await bookSave.isDisabled());
    if(width===320){
     const saveRect=await bookSave.evaluate(button=>button.getBoundingClientRect().toJSON());
     check(width+': Book Save fits short screen',saveRect.bottom<=height+2);
    }
   }
   await page.screenshot({path:out+'/'+width+'-'+tag+'.png'});
   if(id==='idPhotoMaker')await verifyIDSheet(overlay,page,String(width));
   await overlay.locator('[data-rivo-modal-close]').click();
   await overlay.waitFor({state:'detached',timeout:8000});
   check(width+': '+tag+' close works',await page.locator('[data-rivo-managed-modal="true"]').count()===0);
  }

  await page.locator('.mobilebar [data-tab="me"]').click();
  await page.locator('.app-settings').waitFor({state:'visible'});
  await page.screenshot({path:out+'/'+width+'-settings.png'});
  const settingsInitial=await page.evaluate(()=>{
    const detail=document.querySelector('.rivo-scan-pref-details');
    const general=document.querySelector('.settings-lang');
    const heading=document.querySelector('.rivo-scan-pref-summary');
    return {exists:!!detail,collapsed:!!detail&&!detail.open,fields:detail?.querySelectorAll('[data-scan-pref]').length,
      generalVisible:!!general&&general.getBoundingClientRect().top<innerHeight-90,
      summaryVisible:!!heading&&heading.getBoundingClientRect().width>=innerWidth*.75};
  });
  check(width+': scanner advanced choices start collapsed but remain available',
    settingsInitial.exists&&settingsInitial.collapsed&&settingsInitial.fields===9&&
    settingsInitial.generalVisible&&settingsInitial.summaryVisible);
  await page.locator('.rivo-scan-pref-summary').click();
  const settingsExpanded=await page.evaluate(()=>{
    const root=document.querySelector('.rivo-scan-pref-details');
    const controls=[...root.querySelectorAll('select[data-scan-pref]')];
    return {open:root.open,number:controls.length,
      fit:controls.every(el=>{const b=el.getBoundingClientRect(),c=el.closest('.rivo-scanner-pref').getBoundingClientRect();
        return b.left>=c.left-2&&b.right<=c.right+2&&b.width>160&&getComputedStyle(el).fontSize==='14px';})};
  });
  check(width+': scanner preset choices have full-width legible selectors',
    settingsExpanded.open&&settingsExpanded.number===5&&settingsExpanded.fit);
  await page.screenshot({path:out+'/'+width+'-settings-advanced.png'});
  await page.locator('.rivo-scan-pref-summary').click();
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
 for(const [width,height,language,touch] of [[320,568,'de',true],[360,740,'ar',true],[740,360,'ar',true],[1024,768,'fr',true],[1024,768,'en',false]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
  await ctx.addInitScript(({version,language})=>{
   localStorage.setItem('rivo-language',language);
   localStorage.setItem('rivo-release-notes-read',version);
  },{version:appVersion,language});
  const page=await ctx.newPage();
  try{
   await page.goto(base);
   await page.locator('[data-tab="tools"]:visible').click();
   if(width>780){
    const wide=await page.evaluate(()=>{
     const bar=document.querySelector('.mobilebar').getBoundingClientRect();
     const sidebar=document.querySelector('.sidebar').getBoundingClientRect();
     const main=document.querySelector('.main').getBoundingClientRect();
     return {bar:bar.width>0,fixed:Math.abs(bar.bottom-innerHeight)<=1,
       sidebar:sidebar.width>0,mainWidth:main.width};
    });
    check(language+' wide navigation leaves room for tools',
     wide.bar===touch&&wide.sidebar===!touch&&wide.mainWidth>=width*.65&&(!touch||wide.fixed));
   }
   await page.locator('[data-hub-action="idPhotoMaker"]').click();
   await verifyIDSheet(page.locator('.rivo-id-dialog'),page,width+'x'+height+'-'+language);
  }finally{await ctx.close()}
 }
}finally{
 await browser.close();
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
}
console.log(JSON.stringify({checks:report.checks.length,failures:report.failures,
 phoneWidths:report.screens.map(screen=>screen.width)},null,2));
assert.equal(report.failures.length,0,'RivoScan UI responsive test failed');

async function verifyIDSheet(dialog,page,scenario){
 const source=new PNG({width:48,height:110});
 for(let y=0;y<source.height;y++){
  for(let x=0;x<source.width;x++){
   const i=(y*source.width+x)*4;
   source.data.set([32,80+y,132,255],i);
  }
 }
 const save=dialog.locator('.rivo-workspace-bottom button');
 check(scenario+' ID photo requires a source to save',await save.isDisabled());
 await dialog.locator('input[type=file]').setInputFiles({
  name:'layout-sample.png',mimeType:'image/png',buffer:PNG.sync.write(source)
 });
 const canvas=dialog.locator('.rivo-shared-preview-dock canvas');
 await canvas.waitFor({state:'visible'});
 await dialog.locator('.rivo-workspace-settings-toggle').click();
 const adjust=dialog.locator('[data-preview-task="adjust"]');
 await adjust.click();
 const group=dialog.locator('[data-preview-panel="adjust"]');
 const tabs=dialog.locator('.rivo-workspace-taskbar');
 const tabBounds=await tabs.boundingBox();
 const layout=await group.evaluate(el=>{
  const last=el.lastElementChild,first=el.firstElementChild;
  const body=el.getBoundingClientRect(),label=first.getBoundingClientRect();
  el.scrollTop=el.scrollHeight;
  const bounds=last.getBoundingClientRect();
  const hit=document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  return {firstVisible:label.top>=body.top&&label.bottom<=body.bottom+1,
    lastReachable:last.contains(hit),lastFits:bounds.bottom<=body.bottom+1};
 });
 check(scenario+' size field and final action reachable',layout.firstVisible&&layout.lastReachable&&layout.lastFits);
 check(scenario+' settings tabs stay in place when scrolling',Math.abs((await tabs.boundingBox()).y-tabBounds.y)<1);
 await dialog.locator('[data-preview-task="background"]').click();
 await adjust.click();
 check(scenario+' newly selected group starts at first control',await group.evaluate(el=>el.scrollTop===0));
 const preview=await canvas.boundingBox();
 check(scenario+' preview fits without covering controls',preview.width>80&&preview.height>110&&
  (preview.y+preview.height<=tabBounds.y+1||preview.x+preview.width<=tabBounds.x+1||
   tabBounds.x+tabBounds.width<=preview.x+1));
 await page.screenshot({path:out+'/'+scenario+'-id-photo-loaded.png'});
 const select=group.locator('select');
 for(const [size,across,down] of [['35x45',2,2],['30x40',2,3],['40x50',2,2],['2x2',1,2]]){
  await select.selectOption(size);
  const previewPNG=await canvas.evaluate(el=>el.toDataURL('image/png').split(',')[1]);
  const download=page.waitForEvent('download');
  await save.click();
  const bytes=await readFile(await (await download).path());
  const png=PNG.sync.read(bytes);
  check(scenario+' '+size+' saved pixels match preview',
   png.data.equals(PNG.sync.read(Buffer.from(previewPNG,'base64')).data));
  const resolution=[];
  for(let offset=8;offset+12<=bytes.length;offset+=bytes.readUInt32BE(offset)+12){
   if(bytes.toString('ascii',offset+4,offset+8)==='pHYs')
    resolution.push([bytes.readUInt32BE(offset+8),bytes.readUInt32BE(offset+12),bytes[offset+16]]);
  }
  check(scenario+' '+size+' print format is 10 × 15 cm at 300 DPI',
   png.width===1181&&png.height===1772&&JSON.stringify(resolution)==='[[11811,11811,1]]');
  // Count actual ink intervals and compare both paper edges on each axis.
  const ink=(x,y)=>png.data[(y*png.width+x)*4]===32;
  const start=png.data.findIndex((v,i)=>i%4===0&&v===32)/4;
  function centered(length,painted,copies){
   const marks=Array.from({length},(_,i)=>painted(i));
   const first=marks.indexOf(true),last=marks.lastIndexOf(true);
   const starts=marks.filter((v,i)=>v&&!marks[i-1]).length;
   return starts===copies&&first>=0&&Math.abs(first-(length-1-last))<=1;
  }
  check(scenario+' '+size+' printed grid centered on both axes',start>=0&&
   centered(png.width,x=>ink(x,Math.floor(start/png.width)),across)&&
   centered(png.height,y=>ink(start%png.width,y),down));
 }
 await dialog.locator('[data-preview-task="source"]').click();
 const file=dialog.locator('input[type=file]');
 await file.setInputFiles({name:'unreadable.png',mimeType:'image/png',buffer:Buffer.from('invalid')});
 await canvas.waitFor({state:'hidden'});
 await dialog.locator('[role=status]:not(:empty)').waitFor();
 check(scenario+' invalid replacement clears the previous sheet',
  await save.isDisabled()&&await dialog.locator('.rivo-workspace-empty').isVisible());
 await file.setInputFiles({name:'new.png',mimeType:'image/png',buffer:PNG.sync.write(source)});
 await canvas.waitFor({state:'visible'});
 check(scenario+' good replacement restores export',await save.isEnabled());
}
