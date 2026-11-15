import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScanLedger,scannerDailyFile} from '../src/scan-ledger.js';
import {safeScannedUrl} from '../src/barcode-scanner.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function memory(){
 const m=new Map();return {getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,value)};
}
test('same QR across all dates is saved once across sessions',async()=>{
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
 assert.equal(tomorrow.duplicate,true);
 assert.equal(tomorrow.saved,false);
 assert.equal(writes.length,1,'lifetime uniqueness across dates');
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

test('old dated QR/barcode journal rows migrate into the two stable files once',async()=>{
 const storage=memory(),files=new Map();
 storage.setItem('rivo-scan-ledger-codes-v1',JSON.stringify([
  {at:'2026-11-13T09:30:00Z',day:'2026-11-13',localAt:'2026-11-13 10:30:00.000',type:'QR',value:'https://one.example',exported:true},
  {at:'2026-11-14T09:31:00Z',day:'2026-11-14',localAt:'2026-11-14 10:31:00.000',type:'QR',value:'https://one.example',exported:true},
  {at:'2026-11-14T09:32:00Z',day:'2026-11-14',localAt:'2026-11-14 10:32:00.000',type:'CODE128',value:'983729',exported:true}
 ]));
 const bridge={appendScannerText:async({name,line})=>{
  const rows=files.get(name)||[];
  const key=line.split('\t').slice(1).join('\t');
  if(rows.some(old=>old.split('\t').slice(1).join('\t')===key))return {alreadyPresent:true};
  rows.push(line);files.set(name,rows);return {saved:true};
 }};
 const ledger=createScanLedger({storage,bridge,clock:()=>new Date('2026-11-15T10:00:00Z')});
 const migrated=await ledger.resync('codes');
 assert.equal(migrated.count,3);
 assert.deepEqual([...files.keys()].sort(),['RS_Bar.txt','RS_QR.txt']);
 assert.equal(files.get('RS_QR.txt').length,1);
 assert.equal(files.get('RS_Bar.txt').length,1);
 await ledger.resync('codes');
 assert.equal(files.get('RS_QR.txt').length,1);
 assert.equal(ledger.read('codes').filter(row=>row.centralized===true).length,3);
 const again=await ledger.append('codes',{format:'QR',value:'https://one.example'});
 assert.equal(again.duplicate,true);
 assert.equal(files.get('RS_QR.txt').length,1);
});
test('native stable journal skips duplicate format/value regardless of scan time',()=>{
 const java=read('native/android/RivoDocumentsPlugin.java');
 assert.ok(java.includes('"RS_QR.txt".equals(name)'));
 assert.ok(java.includes('"RS_Bar.txt".equals(name)'));
 assert.ok(java.includes('previous[1].equals(parts[1])'));
 assert.ok(java.includes('previous[2].equals(parts[2])'));
 assert.ok(java.includes('alreadyPresent",true'));
 assert.ok(!java.includes('RS_(QR|Bar)_\\\\d{8}'));
});
test('all save/delete messages are bottom toasts and bulk tools precede the file list',()=>{
 const main=read('src/main.js');
 const css=read('src/rivo-save-toast.css');
 const bulk=read('src/rivo-bulk-top.css');
 assert.ok(css.includes('bottom:calc(var(--rivo-content-bottom,100px) + 10px)'));
 assert.ok(css.includes('body > .toast.rivo-save-toast'));
 assert.ok(main.indexOf('id="library-selection-root"')<main.indexOf('id="library-list"'));
 assert.ok(main.indexOf('id="home-selection-root"')<main.indexOf('id="home-recents"'));
 assert.ok(main.includes("import './rivo-bulk-top.css'"));
 assert.ok(bulk.includes('position:static!important'));
 assert.ok(bulk.includes('#library-selection-root'));
 assert.ok(bulk.includes('#home-selection-root'));
 assert.ok(bulk.includes('mobilebar'));
});
