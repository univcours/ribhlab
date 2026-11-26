import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({
  headless:true,
  executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']
});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:920,height:900}});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,180))});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
await page.locator('#videoInput').setInputFiles('./tests/sample.mp4');
await page.waitForFunction(()=>{const v=document.querySelector('#video');return v.duration>2});
await page.locator('[data-tab=captions]').click();
await page.locator('#captionInput').setInputFiles({
  name:'test.srt',mimeType:'application/x-subrip',
  buffer:Buffer.from('1\n00:00:00,000 --> 00:00:02,900\nمرحبا Bonjour\n')
});
await page.waitForFunction(()=>document.querySelector('#captionCount').textContent.trim()==='1');
await page.locator('#settingsButton').click();
await page.locator('#preferMp4').uncheck();
await page.locator('#doneSettings').click();
await page.locator('[data-tab=export]').click();
const downloaded=page.waitForEvent('download',{timeout:35000});
await page.locator('#exportVideo').click();
const result=await downloaded;
const output='C:\\AI\\RivoCaption-Web\\tests\\rendered-smoke.webm';
await result.saveAs(output);
console.log('VIDEO_EXPORT_SUCCESS',result.suggestedFilename(),fs.statSync(output).size);
assert.ok(fs.statSync(output).size>2000);
await browser.close();
