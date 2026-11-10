import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const dir='/tmp/rivoscan-visual-ui';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results={privacy:null,perfectScan:null};
try{
 const ctx=await browser.newContext({viewport:{width:393,height:873},acceptDownloads:true});
 const page=await ctx.newPage();
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
 await page.locator('.mobilebar [data-tab="tools"]').click();
 await page.locator('[data-hub-action="privacyShield"]').click();
 const source=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=600;
  const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,480,600);
  c.fillStyle='#333';c.font='20px sans-serif';c.fillText('SAMPLE TEXT',85,200);
  return canvas.toDataURL('image/png');
 });
 const input=Buffer.from(source.split(',')[1],'base64');
 await page.locator('.rivo-shield-file').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:input});
 const canvas=page.locator('.rivo-shield-stage canvas');
 await canvas.waitFor({state:'visible'});
 assert.equal(await page.locator('.rivo-shield-save').isDisabled(),true);
 const b=await canvas.boundingBox();
 assert.ok(b&&b.width>80&&b.height>80);
 await page.mouse.move(b.x+b.width*.16,b.y+b.height*.27);
 await page.mouse.down();
 await page.mouse.move(b.x+b.width*.75,b.y+b.height*.40,{steps:7});
 await page.mouse.up();
 assert.equal(await page.locator('.rivo-shield-save').isEnabled(),true);
 await page.screenshot({path:dir+'/393-privacy-shield.png'});
 page.once('dialog',d=>d.accept());
 const downloadPromise=page.waitForEvent('download');
 await page.locator('.rivo-shield-save').click();
 const download=await downloadPromise;
 const bytes=await readFile(await download.path());
 assert.ok(bytes.length>1000);
 const pixels=await page.evaluate(async b64=>{
  const image=new Image();image.src='data:image/jpeg;base64,'+b64;await image.decode();
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
  const x=c.getContext('2d');x.drawImage(image,0,0);
  const redacted=x.getImageData(image.width*.38,image.height*.34,1,1).data;
  const clear=x.getImageData(image.width*.89,image.height*.82,1,1).data;
  return {redacted:[...redacted],clear:[...clear]};
 },bytes.toString('base64'));
 assert.ok(pixels.redacted[0]<20&&pixels.redacted[1]<20&&pixels.redacted[2]<20);
 assert.ok(pixels.clear[0]>235&&pixels.clear[1]>235&&pixels.clear[2]>235);
 results.privacy={success:true,output:download.suggestedFilename(),pixels};
 await page.locator('.mobilebar [data-tab="tools"]').click();
 await page.locator('[data-hub-action="perfectScanQuality"]').click();
 await page.locator('.rivo-perfect-file').setInputFiles({name:'quality.png',mimeType:'image/png',buffer:input});
 await page.locator('[data-perfect="process"]').click();
 await page.locator('.rivo-perfect-compare-range').waitFor({state:'visible',timeout:35000});
 await page.locator('.rivo-perfect-compare-range').fill('30');
 assert.equal(await page.locator('[data-perfect="save"]').isEnabled(),true);
 await page.screenshot({path:dir+'/393-perfectscan-quality.png'});
 results.perfectScan={success:true,comparison:'30%'};
}finally{
 await browser.close();
 await writeFile(dir+'/features-e2e-report.json',JSON.stringify(results,null,2));
}
console.log(results);
