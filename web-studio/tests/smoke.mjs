import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const browser=await chromium.launch({
  headless:true,
  executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args:['--no-sandbox','--disable-gpu-sandbox','--autoplay-policy=no-user-gesture-required']
});
const failures=[];
async function check(label,fn){
  try{await fn();console.log('PASS',label)}
  catch(e){console.error('FAIL',label,e.message);failures.push(label+': '+e.message)}
}
for(const viewport of [{width:390,height:844},{width:1365,height:820}]){
  const page=await browser.newPage({viewport,acceptDownloads:true});
  const name=viewport.width<600?'mobile':'desktop';
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await check(name+' load and navigation',async()=>{
    await page.goto('http://127.0.0.1:4174/',{waitUntil:'domcontentloaded'});
    await page.locator('.tab').count().then(n=>assert.equal(n,4));
    await page.locator('[data-tab=captions]').click();
    assert.equal(await page.locator('#panel-captions').isVisible(),true);
    await page.locator('[data-tab=styles]').click();
    assert.equal(await page.locator('#panel-styles').isVisible(),true);
    await page.locator('[data-tab=export]').click();
    assert.equal(await page.locator('#panel-export').isVisible(),true);
  });
  await check(name+' settings moved into gear',async()=>{
    await page.locator('#settingsButton').click();
    assert.equal(await page.locator('#settingsDialog').isVisible(),true);
    await page.locator('#modelSelect').selectOption('base');
    await page.locator('#languageSelect').selectOption('ar');
    await page.locator('#qualitySelect').selectOption('480');
    await page.locator('#doneSettings').click();
    assert.equal(await page.locator('#settingsDialog').isVisible(),false);
    await page.locator('[data-tab=ai]').click();
    assert.match(await page.locator('#settingsSummary').textContent(),/Base/);
  });
  await check(name+' active illuminated feature groups',async()=>{
    const active=page.locator('.tab.is-active');
    assert.equal(await active.getAttribute('data-accent'),'ai');
    const boxShadow=await active.evaluate(el=>getComputedStyle(el).boxShadow);
    assert.notEqual(boxShadow,'none');
  });
  await check(name+' subtitles and all file exports',async()=>{
    await page.locator('[data-tab=captions]').click();
    const imported='1\n00:00:00,200 --> 00:00:01,300\nالدارجة ça va\n\n2\n00:00:01,400 --> 00:00:02,800\nBonjour\n';
    await page.locator('#captionInput').setInputFiles({
      name:'smoke.srt',mimeType:'application/x-subrip',buffer:Buffer.from(imported)
    });
    await page.waitForFunction(() => document.getElementById('captionCount').textContent.trim() === '2');
    assert.equal((await page.locator('#captionCount').textContent()).trim(),'2');
    const dlp=page.waitForEvent('download');
    await page.locator('#exportCaptionsQuick').click();
    const downloaded=await dlp;
    assert.match(downloaded.suggestedFilename(),/\.srt$/);
    await page.locator('[data-tab=styles]').click();
    await page.locator('[data-style=highlight]').click();
    assert.equal(await page.locator('[data-style=highlight]').getAttribute('class'),'preset is-active');
  });
  await check(name+' browser does not throw at startup',()=>assert.equal(errors.length,0,errors.join('; ')));
  await page.screenshot({path:path.join(root,'tests',name+'.png'),fullPage:true});
  console.log('SCREENSHOT',name+'.png');
  await page.close();
}
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
