/* Actual RivoScan web runtime layout QA. These screenshots are browser-emulated,
 * not Android hardware or live AdMob proofs. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const out=process.env.RIVO_QA_DIR||'/tmp/rivo-04576-browser-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const report={screens:[],checks:[],failures:[]};
const check=(label,result)=>{report.checks.push({label,pass:!!result});if(!result)report.failures.push(label);};
try{
 for(const [width,height,lang] of [
  [320,640,'auto'],[360,760,'auto'],[393,852,'auto'],
  [412,915,'auto'],[768,1024,'auto'],[640,360,'auto'],
  [393,852,'fr'],[393,852,'ar']
 ]){
  const id=width+'x'+height+'-'+lang;
  const context=await browser.newContext({viewport:{width,height},locale:lang==='fr'?'fr-FR':'en-US',isMobile:width<768,hasTouch:width<768,permissions:['camera']});
  await context.addInitScript(language=>{
   localStorage.setItem('rivo-release-notes-read','0.45.90');
   if(language==='auto')localStorage.removeItem('rivo-language');
   else localStorage.setItem('rivo-language',language);
  },lang);
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('.rivo-compact-home').waitFor({timeout:25000});
  // Emulate only native WebView's reserved-content CSS; not an Android screenshot.
  await page.evaluate(()=>{
    document.body.classList.add('rivo-native-android','rivo-has-ad-banner');
    document.documentElement.style.setProperty('--rivo-content-top','70px');
    document.documentElement.style.setProperty('--rivo-content-bottom','175px');
    document.documentElement.style.setProperty('--rivo-banner-bottom','104px');
  });
  await page.waitForTimeout(220);
  const home=await page.evaluate(()=>{
   const r=e=>e?.getBoundingClientRect();
   const trust=r(document.querySelector('.rivo-home-trust'));
   const rail=r(document.querySelector('.rivo-feature-rail'));
   const search=r(document.querySelector('.rivo-home-search-title-row'));
   const docs=r(document.querySelector('#home-recents'));
   const root=document.querySelector('.rivo-compact-home');
   const select=document.querySelector('#header-language');
   const locale=document.querySelector('.rivo-top-locale'),display=document.querySelector('.rivo-locale-visible-value');
   const l=r(locale),d=r(display),headerControls=r(document.querySelector('.rivo-top-controls'));
   const tiles=[...document.querySelectorAll('.rivo-feature-tile')];
   const clippedTile=tiles.some(el=>{
    const b=r(el),label=r(el.querySelector('strong'));
    return b.left< -1||b.right>innerWidth+1||label.bottom>b.bottom+1||label.top<b.top-1;
   });
   const content=r(document.querySelector('.content'));
   return{
    noOverlap:trust&&rail&&search&&docs&&trust.bottom<=rail.top+1&&rail.bottom<=search.top-1&&search.bottom<=docs.top+1,
    textFits:!clippedTile&&document.documentElement.scrollWidth<=innerWidth+2,
    railRows:new Set(tiles.map(t=>Math.round(r(t).top))).size,
    visibleLang:display?.textContent?.trim(),selected:select?.value,
    localeFits:l&&d&&headerControls&&l.left>=-1&&l.right<=innerWidth+1&&d.left>=l.left-1&&d.right<=l.right+1,
    localeUnclipped:display&&display.scrollWidth<=display.clientWidth+2,
    scrolling:getComputedStyle(root).overflowY,
    contentBottom:content?.bottom,
    bodyHeight:innerHeight,
   };
  });

  const homeIcons=await page.evaluate(()=>{
   const tiles=[...document.querySelectorAll('.rivo-feature-rail>.rivo-feature-tile')];
   const boxes=tiles.map(tile=>{
    const icon=tile.querySelector('.rivo-feature-icon'),title=tile.querySelector('strong');
    if(!icon||!title)return {valid:false,animated:false};
    const r=e=>e.getBoundingClientRect();
    const a=r(icon),b=r(title),c=r(tile),styles=getComputedStyle(icon);
    const separated=(a.right<=b.left+2)||(b.right<=a.left+2);
    const contained=a.left>=c.left-1&&a.right<=c.right+1&&
                    a.top>=c.top-1&&a.bottom<=c.bottom+1&&
                    b.top>=c.top-1&&b.bottom<=c.bottom+1;
    const symbol=icon.querySelector('.rivo-material-symbol[data-material-symbol]');
     const p=symbol&&r(symbol);
     const fs=symbol&&getComputedStyle(symbol);
     const symbolFits=!!p&&p.width>=18&&p.height>=18&&
       p.left>=a.left-1&&p.right<=a.right+1&&p.top>=a.top-1&&p.bottom<=a.bottom+1;
     const materialFont=!!fs&&fs.fontFamily.toLowerCase().includes('material');
     const contrast=styles.color!=='rgba(0, 0, 0, 0)'&&styles.color!=='rgb(255, 255, 255)';
     return {valid:separated&&contained&&a.width>=23&&b.width>18&&symbolFits&&materialFont&&contrast,
       animated:styles.animationName==='none'&&getComputedStyle(icon,'::before').animationName==='none',
       diagnostic:{id:tile.dataset.rivoFeature,separated,contained,width:a.width,labelWidth:b.width,
         color:styles.color,symbolFits,font:fs?.fontFamily,bg:styles.backgroundImage.slice(0,100),
         icon:a.toJSON(),label:b.toJSON(),tile:c.toJSON()}};
   });
   const nav=[...document.querySelectorAll('.mobilebar .rivo-nav-icon')];
   return {count:boxes.length,valid:boxes.every(x=>x.valid),animated:boxes.every(x=>x.animated),
           bad:boxes.filter(x=>!x.valid).map(x=>x.diagnostic),
           navCount:nav.length,navMaterial:nav.every(x=>{
              const m=x.querySelector('.rivo-material-symbol[data-material-symbol]');
              return !!m&&m.getBoundingClientRect().width>15&&
                getComputedStyle(m).fontFamily.toLowerCase().includes('material');
            })};
  });
  check(id+' Home Material Symbols Rounded fit and have sufficient contrast',
    homeIcons.count===4&&homeIcons.valid);
  check(id+' Home icons have no decorative glow motion',
    homeIcons.animated);
  check(id+' Navbar retains four Material Symbols Rounded icons plus center Scan',
    homeIcons.navCount===4&&homeIcons.navMaterial);
  const cameraOrbit=await page.evaluate(()=>{
   const ring=document.querySelector('.rivo-nav-scan-ring');
   return ring&&getComputedStyle(ring,'::before').animationName==='rivo-orbit-border';
  });
  check(id+' only central Smart Scan camera keeps original rotating ring',cameraOrbit);
  check(id+' Home card/search/recents do not overlap',home.noOverlap);
  check(id+' Home cards contained and no page horizontal overflow',home.textFits);
  check(id+' Home 2 or 4 columns by width',home.railRows===(width<=420?2:1));
  check(id+' language choice displays entirely',home.localeFits&&home.localeUnclipped&&home.visibleLang===(lang==='auto'?'AUTO':lang.toUpperCase()));
  check(id+' language select stays functional',home.selected===(lang==='auto'?'auto':lang));
  check(id+' home scrolls on small viewports',home.scrolling==='auto');
  await page.screenshot({path:out+'/'+id+'-home.png'});report.screens.push(id+'-home.png');
  // Verify content scroll makes search/recents reachable regardless of height.
  const reachable=await page.evaluate(()=>{
   const home=document.querySelector('.rivo-compact-home'),target=document.querySelector('.rivo-home-search-title-row');
   target.scrollIntoView({block:'end',behavior:'instant'});
   const b=target.getBoundingClientRect(),h=home.getBoundingClientRect();
   return b.top>=h.top-2&&b.bottom<=h.bottom+2;
  });
  check(id+' My Files search reachable by scrolling',reachable);
  // Open the real Tools view, scroll to final Edit/utility card.
  await page.evaluate(()=>document.querySelector('.mobilebar [data-tab="tools"]')?.click());
  await page.locator('.rivo-tools-scroll').waitFor({timeout:12000});
  const tools=await page.evaluate(()=>{
   const scroll=document.querySelector('.rivo-tools-scroll'),last=[...(scroll?.querySelectorAll('.rivo-hub-tile')||[])].at(-1);
   if(!scroll||!last)return {ok:false};
   scroll.scrollTop=scroll.scrollHeight;last.scrollIntoView({block:'end'});
   const a=scroll.getBoundingClientRect(),b=last.getBoundingClientRect();
   const style=getComputedStyle(scroll);
   return {ok:b.top>=a.top-2&&b.bottom<=a.bottom+3&&b.left>=-1&&b.right<=innerWidth+1,
    overflow:style.overflowY,hasScroll:scroll.scrollHeight>scroll.clientHeight};
  });
  check(id+' Tools last card fully reachable above ad safe band',tools.ok);
  check(id+' Tools scrolls independently',tools.overflow==='auto');
  const toolIcons=await page.evaluate(()=>{
   const tiles=[...document.querySelectorAll('.rivo-tools-scroll .rivo-hub-tile')];
   const rows=tiles.map(tile=>{
    const icon=tile.querySelector('.tool-icon'),label=tile.querySelector('strong');
    if(!icon||!label)return {okay:false,glow:false};
    const r=e=>e.getBoundingClientRect(),a=r(icon),b=r(label),c=r(tile);
    const overlap=a.left<b.right-2&&b.left<a.right-2&&
                  a.top<b.bottom-2&&b.top<a.bottom-2;
    const inside=a.left>=c.left-1&&a.right<=c.right+1&&
                 b.left>=c.left-1&&b.right<=c.right+1&&
                 a.top>=c.top-1&&a.bottom<=c.bottom+1;
    return {okay:inside&&!overlap,
            glow:getComputedStyle(icon,'::before').animationName==='none'&&
            getComputedStyle(icon).animationName==='none',
            diagnostic:{id:tile.dataset.hubAction,inside,overlap,icon:a.toJSON(),label:b.toJSON(),tile:c.toJSON()}};
   });
   return {count:rows.length,okay:rows.every(x=>x.okay),glow:rows.every(x=>x.glow),
            bad:rows.filter(x=>!x.okay).map(x=>x.diagnostic)};
  });
  check(id+' All Tools icon badges fit beside feature names without overlap',
    toolIcons.count===18&&toolIcons.okay);
  check(id+' Tools icon halo and glow animation are disabled',
    toolIcons.glow);
  if(width===320&&lang==='auto')console.warn('RIVO_ICON_LAYOUT_DIAGNOSTICS',
    JSON.stringify({home:homeIcons.bad,tools:toolIcons.bad,count:toolIcons.count}).slice(0,14000));

  const toolLocale=await page.evaluate(expected=>{
   const el=document.querySelector('.rivo-locale-visible-value'),label=document.querySelector('.rivo-top-locale');
   if(!el||!label)return false;
   const a=el.getBoundingClientRect(),b=label.getBoundingClientRect();
   return a.width>24&&a.left>=b.left-1&&a.right<=b.right+1&&
     el.scrollWidth<=el.clientWidth+2&&
     el.textContent.trim()===expected;
  },lang==='auto'?'AUTO':lang.toUpperCase());
  check(id+' AUTO fully displayed on Tools header',toolLocale);

  await page.screenshot({path:out+'/'+id+'-tools-bottom.png'});report.screens.push(id+'-tools-bottom.png');

  if(width===393&&lang==='auto'){
   await page.evaluate(()=>document.querySelector('.mobilebar [data-tab="me"]')?.click());
   await page.locator('.app-settings .settings-lang .settings-row-icon').waitFor({state:'visible',timeout:9000});
   const settings=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.app-settings .settings-row-icon')].filter(node=>node.getClientRects().length>0);
    const okay=nodes.every(n=>{
      const icon=n.querySelector('.rivo-material-symbol[data-material-symbol]');
      if(!icon)return false;
      const a=n.getBoundingClientRect(),b=icon.getBoundingClientRect();
      return b.left>=a.left-1&&b.right<=a.right+1&&b.top>=a.top-1&&b.bottom<=a.bottom+1&&
        getComputedStyle(icon).fontFamily.toLowerCase().includes('material')&&
        getComputedStyle(n,'::before').animationName==='none'&&getComputedStyle(n).animationName==='none';
    });
    return {count:nodes.length,okay};
   });
   check(id+' Settings Material Symbols Rounded fit without animated glow',
      settings.count>=3&&settings.okay);
   await page.screenshot({path:out+'/'+id+'-settings-static-icons.png'});
   report.screens.push(id+'-settings-static-icons.png');
   await page.evaluate(()=>document.querySelector('.mobilebar [data-go="home"]')?.click());
  }
  if(width===393&&lang==='auto'){
   await page.evaluate(()=>document.querySelector('.mobilebar [data-go="home"]')?.click());
   await page.locator('.rivo-feature-tile[data-rivo-feature="plateScanner"]').click({timeout:8000});
   const modal=page.locator('.rivo-plate-overlay .rivo-live-split-stage');
   await modal.waitFor({timeout:14000});
   const plate=await modal.evaluate(stage=>{
    const camera=stage.querySelector('.rivo-live-preview'),results=stage.querySelector('.rivo-live-results-pane');
    const r=e=>e.getBoundingClientRect(),a=r(camera),b=r(results),c=r(stage);
    return a.bottom<=b.top-3&&Math.abs(a.height-b.height)<=15&&
      a.left>=c.left-2&&a.right<=c.right+2&&b.bottom<=c.bottom+2&&
      getComputedStyle(stage).gridTemplateColumns.split(' ').length===1;
   });
   check(id+' Plate camera above results, two comparable halves',plate);
   await page.screenshot({path:out+'/'+id+'-plate-modal.png'});report.screens.push(id+'-plate-modal.png');
  }

  if(width===393&&lang==='auto'){
   await page.locator('.rivo-plate-overlay [data-scan-overlay-close]').click({timeout:6000});
   await page.evaluate(()=>document.querySelector('.mobilebar [data-go="home"]')?.click());
   await page.locator('.rivo-feature-tile[data-rivo-feature="scanCode"]').click({timeout:8000});
   const qr=page.locator('.rivo-code-overlay .rivo-live-split-stage');
   await qr.waitFor({timeout:12000});
   const qrSplit=await qr.evaluate(stage=>{
     const r=e=>e.getBoundingClientRect();
     const camera=stage.querySelector('.rivo-live-preview'),results=stage.querySelector('.rivo-live-results-pane');
     if(!camera||!results)return false;
     const a=r(camera),b=r(results),c=r(stage);
     return a.bottom<=b.top-3&&Math.abs(a.height-b.height)<16&&
       a.left>=c.left-2&&b.right<=c.right+2&&b.bottom<=c.bottom+3&&
       getComputedStyle(stage).gridTemplateColumns.split(' ').length===1;
   });
   check(id+' QR camera above results 50/50, no overlap',qrSplit);
   const compact=await qr.evaluate(stage=>{
     const pane=stage.querySelector('.rivo-live-results-pane');
     const row=document.createElement('div');row.className='rivo-code-result-row';
     const line=document.createElement('div');line.className='rivo-code-value-line';
     const value=document.createElement('span');value.className='rivo-code-result-value';
     value.textContent='https://example.org/qa/test/encoded-code';
     const actions=document.createElement('div');actions.className='rivo-code-result-buttons';
     const copy=document.createElement('button');copy.setAttribute('aria-label','Copy');
     const link=document.createElement('button');link.setAttribute('aria-label','Open link');
     copy.innerHTML='<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12"/></svg>';
     link.innerHTML='<svg viewBox="0 0 24 24"><path d="M14 4h6v6"/></svg>';
     actions.append(copy,link);line.append(value,actions);row.append(line);
     const list=pane.querySelector('.rivo-code-results');
     list.hidden=false;list.append(row);
     const a=value.getBoundingClientRect(),b=actions.getBoundingClientRect();
     const btn=copy.getBoundingClientRect();
     const result=b.left>=a.right-2&&Math.abs(a.top-b.top)<20&&btn.width<=32&&
        btn.height<=32&&b.right<=list.getBoundingClientRect().right+2;
     row.remove();return result;
   });
   check(id+' QR value and small copy/link icons on same row',compact);
   await page.screenshot({path:out+'/'+id+'-qr-vertical.png'});report.screens.push(id+'-qr-vertical.png');
   const swipeDismiss=await page.evaluate(async()=>{
     const overlay=document.querySelector('.rivo-code-overlay'),handle=overlay?.querySelector('.rivo-live-head strong');
     if(!overlay||!handle||typeof Touch==='undefined')return false;
     const start=handle.getBoundingClientRect(),x=start.x+Math.max(2,start.width/2),y=start.y+Math.max(4,start.height/2);
     const mk=(yy)=>new Touch({identifier:44,target:handle,clientX:x,clientY:yy,pageX:x,pageY:yy,screenX:x,screenY:yy});
     const initial=mk(y);
     handle.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[initial],targetTouches:[initial],changedTouches:[initial]}));
     await new Promise(resolve=>setTimeout(resolve,120));
     const final=mk(y+150);
     handle.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],targetTouches:[],changedTouches:[final]}));
     return !document.querySelector('.rivo-code-overlay');
   });
   check(id+' pulling QR modal header down stops and closes scanner',swipeDismiss);
  }
  check(id+' no JavaScript page error',errors.length===0);
  await context.close();
 }
}finally{
 await browser.close();
 await writeFile(out+'/responsive-report.json',JSON.stringify(report,null,2));
}
console.log(JSON.stringify({checks:report.checks.length,failed:report.failures.length,failures:report.failures},null,2));
assert.equal(report.failures.length,0,'Responsive screenshot checks found layout regressions');
