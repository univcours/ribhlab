import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import JSZip from 'jszip';
import {validateScannedCode,createCodeLedger,CODE_LEDGER_FILENAME} from '../src/barcode-ledger.js';
import {createOCRWorkbook} from '../src/xlsx-export.js';
import {safeScannedUrl} from '../src/barcode-scanner.js';

const src=path=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');

test('codes keep leading zeros and suspicious spreadsheet content as plain text',()=>{
 const a=validateScannedCode('0000512300','EAN_13','2026-11-08T19:00:00Z');
 assert.equal(a.code,'0000512300');
 assert.equal(a.scannedAt,'2026-11-08T19:00:00.000Z');
 assert.equal(validateScannedCode('=HYPERLINK("https://bad.example")').code,'=HYPERLINK("https://bad.example")');
 assert.throws(()=>validateScannedCode('   '));
 assert.throws(()=>validateScannedCode('x'.repeat(2049)));
});

test('XLSX code database uses inline strings with dates, never executable formulas',async()=>{
 const bytes=await createOCRWorkbook({pages:[{name:'Scanned Codes',rows:[
  ['Code','Type','Scanned At (UTC ISO 8601)'],
  ['00123456789','QR_CODE','2026-11-08T19:00:00.000Z'],
  ['=1+1','CODE_128','2026-11-08T19:01:00.000Z']
 ]}]});
 const zip=await JSZip.loadAsync(bytes);
 const sheet=await zip.file('xl/worksheets/sheet1.xml').async('string');
 assert.match(sheet,/00123456789/);
 assert.match(sheet,/2026-11-08T19:00:00.000Z/);
 assert.match(sheet,/t="inlineStr"/);
 assert.ok(!sheet.includes('<f>'),'Barcode content must never become an Excel formula');
});

test('browser fallback keeps all scan events and can clear without producing empty Excel',async()=>{
 const store=new Map();
 const original=globalThis.localStorage;
 globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
 };
 try{
  const ledger=createCodeLedger();
  assert.deepEqual(await ledger.list(),[]);
  const first=await ledger.append('0000123','QR_CODE','2026-11-08T19:00:00Z');
  const second=await ledger.append('0000123','QR_CODE','2026-11-08T19:01:00Z');
  assert.equal(first.total,1);
  assert.equal(second.total,2);
  assert.deepEqual((await ledger.list()).map(x=>x.code),['0000123','0000123']);
  assert.equal((await ledger.clear()).cleared,2);
  assert.deepEqual(await ledger.list(),[]);
  assert.equal((await ledger.export()).empty,true);
 }finally{
  if(original===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=original;
 }
});

test('only explicitly confirmed http(s) links may open',()=>{
 assert.equal(safeScannedUrl('javascript:alert(1)'),null);
 assert.equal(safeScannedUrl('file:///etc/passwd'),null);
 assert.equal(safeScannedUrl('https://example.org/'), 'https://example.org/');
});

test('Edit chooses external Android app; native live camera has no yellow/dashed frame or Edges button',()=>{
 const native=src('native/android/RivoDocumentsPlugin.java');
 const camera=src('native/android/RivoLiveScannerActivity.java');
 const locale=src('native/android/RivoLocale.java');
 const viewer=src('src/document-viewer.js');
 const main=src('src/main.js');
 assert.ok(native.includes('Intent.ACTION_EDIT'));
 assert.ok(native.includes('Intent.FLAG_GRANT_WRITE_URI_PERMISSION'));
 assert.ok(native.includes('Intent.createChooser(edit'));
 assert.ok(viewer.includes('bridge.editFile({uri:current.uri})'));
 assert.ok(main.includes('RivoDocuments.editFile({uri:doc.uri})'));
 const overlay=camera.slice(camera.indexOf('private static final class LiveEdges'));
 assert.ok(overlay.includes('if(getWidth()<1||getHeight()<1||points==null)return'));
 assert.ok(!overlay.includes('DashPathEffect'));
 assert.ok(!overlay.includes('Color.rgb(255,207,99)'));
 assert.ok(!camera.includes('button(trNative("enhanceBack"),this::reopenCrop)'));
 assert.ok(!locale.includes('"Edges","Compare"'));
});

test('one code workbook is updated in place and removed completely when cleared',()=>{
 const native=src('native/android/RivoDocumentsPlugin.java');
 const file=src('src/barcode-ledger.js');
 assert.equal(CODE_LEDGER_FILENAME,'RivoScan_Scanned_Codes.xlsx');
 assert.ok(native.includes('public void upsertCodeLedger(PluginCall call)'));
 assert.ok(native.includes('public void clearCodeLedger(PluginCall call)'));
 assert.ok(native.includes('findCodeLedgerInMediaStore()'));
 assert.ok(native.includes('findCodeLedgerInTree(Uri tree)'));
 assert.ok(file.includes('await writeRecords(updated)'));
 assert.ok(file.includes('await bridge.clearCodeLedger()'));
});

test('file gallery has compact dense cards and correct file type icon mapping',()=>{
 const css=src('src/polish-density.css');
 const main=src('src/main.js');
 assert.ok(css.includes('grid-auto-flow:row dense'));
 assert.ok(css.includes('.document-entry.doc-selected'));
 assert.ok(css.includes('.rivo-code-history[hidden]'));
 assert.ok(main.includes("libraryLayout = 'grid'"));
 for(const svg of ['file-pdf','file-sheet','file-doc','file-slide','file-zip','file-text'])
  assert.ok(main.includes("'"+svg+"'"));
});
