// Actual RivoScan 9:16 phone UI screenshots for Google Play listings.
// No fake feature screens, invented scanning results or advertising creative.
// WebView previews are not equivalent to physical Android phone verification.
// Render at 360x640 CSS px with DPR=3: undistorted 1080x1920 portraits.
import {chromium} from 'playwright';
import {mkdir,writeFile,stat,readFile} from 'node:fs/promises';
import path from 'node:path';

const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const out=process.env.RIVO_PHONE_OUTPUT||'/tmp/rivoscan-phone-publishing';
const base=process.env.RIVO_URL||'http://127.0.0.1:4173';
const tablets=[
 {label:'phone',viewport:{width:360,height:640},deviceScaleFactor:3,expected:[1080,1920]}
];
const views=[
 ['01_Home','home'],
 ['02_Documents','documents'],
 ['03_Tools','tools'],
 ['04_Book_Scan','bookScan'],
 ['05_Formula_OCR','formulaOcr'],
 ['06_Photo_Translation','photoTranslation'],
 ['07_ID_Photo','idPhotoMaker'],
 ['08_Settings','settings']
];
const records=[],errors=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const t of tablets){
  const folder=path.join(out,t.label);
  await mkdir(folder,{recursive:true});
  const ctx=await browser.newContext({
    viewport:t.viewport,deviceScaleFactor:t.deviceScaleFactor,isMobile:true,hasTouch:true,
    locale:'en-US',colorScheme:'light',reducedMotion:'reduce'
  });
  // Suppress version upgrade dialog, which is not part of the ordinary Play screenshots.
  await ctx.addInitScript(appVersion=>{
   localStorage.setItem('rivo-language','en');
   localStorage.setItem('rivo-release-notes-read',appVersion);
  },version);
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(t.label+': '+e.message));
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.rivo-compact-home').waitFor({state:'visible',timeout:25000});
  await page.evaluate(()=>window.scrollTo(0,0));
  async function shot(view){
   await page.waitForTimeout(170);
   const filepath=path.join(folder,view+'.png');
   const bytes=await page.screenshot({path:filepath,fullPage:false,animations:'disabled'});
   const [w,h]=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
   const st=await stat(filepath);
   if(w!==t.expected[0]||h!==t.expected[1])
    throw Error(t.label+' screenshot '+view+' dimensions '+w+'x'+h+' unexpected');
   if(st.size>=8*1024*1024)throw Error(view+' exceeds Google Play 8 MB limit');
   const state=await page.evaluate(()=>({
    horizontalOverflow:document.documentElement.scrollWidth-window.innerWidth,
    dialogOpen:document.querySelectorAll('[data-rivo-managed-modal=true]').length,
   }));
   records.push({device:t.label,view,filename:path.relative(out,filepath),width:w,height:h,bytes:st.size, ...state});
  }
  await shot('01_Home');
  await page.locator('[data-open-library]').first().evaluate(el=>el.click());
  await page.locator('.library-workspace').waitFor({state:'visible',timeout:12000});
  await shot('02_Documents');
  await page.locator('[data-tab=tools]').first().evaluate(el=>el.click());
  await page.locator('.rivo-tools-hub').waitFor({state:'visible',timeout:12000});
  await shot('03_Tools');
  for(const [view,id] of [
   ['04_Book_Scan','bookScan'],
   ['05_Formula_OCR','formulaOcr'],
   ['06_Photo_Translation','photoTranslation'],
   ['07_ID_Photo','idPhotoMaker']
  ]){
    const button=page.locator('[data-hub-action="'+id+'"]').first();
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const overlay=page.locator('[data-rivo-managed-modal=true]').last();
    await overlay.waitFor({state:'visible',timeout:12000});
    await shot(view);
    await overlay.locator('[data-rivo-modal-close]').click();
    await overlay.waitFor({state:'detached',timeout:10000});
  }
  await page.locator('[data-tab=me]').first().evaluate(el=>el.click());
  await page.locator('.app-settings').waitFor({state:'visible',timeout:12000});
  await shot('08_Settings');
  await ctx.close();
 }
}finally{
 await browser.close();
 await writeFile(path.join(out,'audit.json'),JSON.stringify({
  source:`Actual RivoScan ${version} WebView UI at 360x640 CSS px / 3 DPR`,
  notes:'Screenshots show actual current WebView UI, not fabricated camera images or AdMob creative. Android device verification remains required.',
  tablets,views,records,errors
 },null,2));
}
if(errors.length)throw Error('Browser JS errors: '+errors.join(' | '));
console.log(JSON.stringify({deviceSizes:tablets.length,images:records.length,errors},null,2));
