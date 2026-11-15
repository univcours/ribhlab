import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScanLedger,scannerDailyFile} from '../src/scan-ledger.js';
import {safeScannedUrl} from '../src/barcode-scanner.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function memory(){
 const m=new Map();return {getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,value)};
}
test('same QR on the same day is saved once across consecutive and reopened scans',async()=>{
 const storage=memory(),writes=[];
 const bridge={appendScannerText:async data=>{writes.push(data);return{saved:true}}};
 let date=new Date(2026,10,15,16,10,0);
 const first=createScanLedger({storage,bridge,clock:()=>date});
 const result=await first.append('codes',{format:'QR',value:'https://example.com/document'});
 assert.equal(result.saved,true);
 const same=await first.append('codes',{format:'QR',value:'https://example.com/document'});
 assert.equal(same.saved,false);
 assert.equal(same.duplicate,true);
 assert.equal(same.alreadySaved,true);
 assert.equal(writes.length,1);
 const reopened=createScanLedger({storage,bridge,clock:()=>date});
 const again=await reopened.append('codes',{format:'QR',value:'https://example.com/document'});
 assert.equal(again.duplicate,true);
 assert.equal(writes.length,1);
 assert.equal(reopened.read('codes').length,1);
 assert.equal(writes[0].name,scannerDailyFile('QR','2026-11-15'));
 date=new Date(2026,10,16,8,30);
 const tomorrow=await reopened.append('codes',{format:'QR',value:'https://example.com/document'});
 assert.equal(tomorrow.saved,true);
 assert.equal(writes.length,2,'a different calendar day has its own daily log');
});
test('other barcode formats or different values still save independently',async()=>{
 const calls=[],storage=memory();
 const ledger=createScanLedger({storage,bridge:{appendScannerText:async item=>calls.push(item)},
  clock:()=>new Date(2026,10,15,16,10)});
 for(const item of [
  {format:'QR',value:'123'},
  {format:'CODE128',value:'123'},
  {format:'QR',value:'456'}
 ]){
  assert.equal((await ledger.append('codes',item)).saved,true);
 }
 assert.equal(calls.length,3);
 assert.equal(ledger.read('codes').length,3);
});
test('failed log delivery is retried without creating a second journal row',async()=>{
 const store=memory(),writes=[];
 let fail=true;
 const bridge={appendScannerText:async item=>{if(fail)throw Error('unavailable');writes.push(item);}};
 const ledger=createScanLedger({storage:store,bridge,clock:()=>new Date(2026,10,15,16,10)});
 const first=await ledger.append('codes',{format:'QR',value:'TEST'});
 assert.equal(first.saved,false);
 fail=false;
 const repeat=await ledger.append('codes',{format:'QR',value:'TEST'});
 assert.equal(repeat.duplicate,true);
 assert.equal(repeat.saved,false);
 assert.equal(writes.length,1);
 assert.equal(ledger.read('codes').length,1);
 assert.equal(ledger.read('codes')[0].exported,true);
});
test('only http and https links expose a browser action',()=>{
 assert.equal(safeScannedUrl('https://example.com/?a=1'),'https://example.com/?a=1');
 assert.equal(safeScannedUrl('http://example.com/'),'http://example.com/');
 for(const value of ['javascript:alert(1)','data:text/html,x','file:///tmp/x','intent://app','https://']){
  assert.equal(safeScannedUrl(value),null);
 }
});
test('UltraScan provides independent copy and optional open actions without copying aggregated codes',()=>{
 const source=read('src/barcode-scanner.js');
 assert.ok(source.includes("copyButton=iconButton(L[4]"));
 assert.ok(source.includes("writeClipboard(item.value)"));
 assert.ok(source.includes("if(safeScannedUrl(item.value))"));
 assert.ok(source.includes("linkButton=iconButton(L[15]"));
 assert.ok(source.includes("RivoDocuments.openWebLink({url})"));
 assert.ok(source.includes("duplicateMessage(identity)"));
 assert.ok(source.includes("if(saved?.duplicate||saved?.alreadySaved)"));
 assert.ok(!source.includes("writeText(result.textContent"));
 const java=read('native/android/RivoDocumentsPlugin.java');
 assert.ok(java.includes('public void openWebLink(PluginCall call)'));
 assert.ok(java.includes('Intent.CATEGORY_BROWSABLE'));
 assert.ok(java.includes('"https".equalsIgnoreCase(scheme)'));
 assert.ok(java.includes('"http".equalsIgnoreCase(scheme)'));
});
test('Arabic QR interface never contains colloquial Darija messages',()=>{
 const source=read('src/barcode-scanner.js');
 const arabic=source.slice(source.indexOf(' ar:['),source.indexOf(' fr:['));
 assert.ok(arabic.includes('تم مسح هذا الرمز وحفظه مسبقًا'));
 assert.ok(arabic.includes('فتح الرابط'));
 assert.doesNotMatch(arabic,/كتتعرف|فالهاتف|غادي|ديال|اختار صورة|ما تلقا|تحفظ فملف/);
});
