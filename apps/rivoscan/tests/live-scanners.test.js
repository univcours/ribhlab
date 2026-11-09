import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createScanLedger,scannerLogNames} from '../src/scan-ledger.js';
import {normalizePlate,plateCandidates,matchesPlate} from '../src/plate-scanner.js';
import {newScanDeduplicator,safeScannedUrl,decodeFormat} from '../src/barcode-scanner.js';
import {readFileSync} from 'node:fs';

function memory(){
 const values=new Map();
 return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
}
test('Each successful QR/barcode scan appends to ONE persistent TXT and XLSX, never formulas',async()=>{
 const files=new Map(),bridge={upsertScannerLog:async({name,mimeType,base64})=>{files.set(name,{mimeType,bytes:Buffer.from(base64,'base64')});return {name};}};
 let time=0;
 const ledger=createScanLedger({storage:memory(),bridge,clock:()=>new Date(1730000000000+time++*1000)});
 await Promise.all([
  ledger.append('codes',{format:'QR',value:'https://example.org'}),
  ledger.append('codes',{format:'EAN13',value:'6111234567890'}),
  ledger.append('codes',{format:'CODE128',value:'=HYPERLINK("malicious")'})
 ]);
 assert.deepEqual([...files.keys()].sort(),Object.values(scannerLogNames.codes).sort());
 const txt=files.get(scannerLogNames.codes.text).bytes.toString('utf8');
 assert.match(txt,/Date & Time\tType\tValue/);
 assert.match(txt,/6111234567890/);
 assert.equal(txt.split('\n').filter(Boolean).length,4);
 const zip=await JSZip.loadAsync(files.get(scannerLogNames.codes.excel).bytes);
 const xml=await zip.file('xl/worksheets/sheet1.xml').async('string');
 assert.match(xml,/t="inlineStr"/);
 assert.match(xml,/6111234567890/);
 assert.match(xml,/=HYPERLINK/);
 assert.doesNotMatch(xml,/<f>/);
 assert.equal(ledger.read('codes').length,3);
});
test('Plate log always records unmatched plates; a match records linked photo',async()=>{
 const storage=memory(),calls=[];
 const bridge={upsertScannerLog:async value=>{calls.push(value);return {}}};
 const db=createScanLedger({storage,bridge,clock:()=>new Date('2026-11-09T10:35:00Z')});
 await db.append('plates',{value:'12345A6',match:false});
 await db.append('plates',{value:'56789B2',match:true,photoName:'PlateMatch_56789B2_01.jpg'});
 assert.equal(db.read('plates').length,2);
 assert.equal(db.read('plates')[0].match,false);
 assert.equal(db.read('plates')[1].photo,'PlateMatch_56789B2_01.jpg');
 assert.equal(calls.length,4);
 assert.ok(calls.some(c=>c.name==='RivoScan_Plates.xlsx'));
 assert.ok(calls.some(c=>c.name==='RivoScan_Plates.txt'));
});
test('A failed native write remains in journal and can be resynchronized',async()=>{
 const storage=memory(),uploaded=[];
 let fail=true;
 const bridge={upsertScannerLog:async data=>{if(fail)throw Error('Storage not ready');uploaded.push(data.name);}};
 const db=createScanLedger({storage,bridge});
 await assert.rejects(db.append('codes',{value:'12345',format:'QR'}),/Storage not ready/);
 assert.equal(db.read('codes').length,1);
 fail=false;
 await db.resync('codes');
 assert.deepEqual(uploaded,['RivoScan_Scans.txt','RivoScan_Scans.xlsx']);
});
test('Plate formatting handles Arabic digits; matching works on full or partial number',()=>{
 assert.equal(normalizePlate('١٢٣٤٥ - أ - ٦'),'12345أ6');
 assert.deepEqual(plateCandidates('١٢٣٤٥ - أ - ٦'),['12345أ6']);
 assert.deepEqual(plateCandidates('12345-A-6\n78901-B-2'),['12345A6','78901B2']);
 assert.equal(matchesPlate('12345-A-6','12345'),true);
 assert.equal(matchesPlate('12345-A-6','A6'),false,'too-short searches cannot trigger alarms');
 assert.equal(matchesPlate('12345-A-6','50001'),false);
 assert.deepEqual(plateCandidates('HELLO THERE'),[]);
});
test('Live reader prevents duplicate frames without dropping distinct codes',()=>{
 let tick=0;
 const d=newScanDeduplicator({clock:()=>tick,gapMs:1500});
 assert.equal(d.accept('ABC'),true);
 tick+=500;assert.equal(d.accept('ABC'),false);
 tick+=600;assert.equal(d.accept('XYZ'),true);
 tick+=2000;d.absence();assert.equal(d.accept('ABC'),true);
 assert.equal(decodeFormat({getBarcodeFormat:()=>11}),'QR');
 assert.equal(safeScannedUrl('javascript:alert(1)'),null);
 assert.equal(safeScannedUrl('https://example.org/'),'https://example.org/');
});
test('Native scanner log storage only permits four reserved filenames',()=>{
 const java=readFileSync(new URL('../native/android/RivoDocumentsPlugin.java',import.meta.url),'utf8');
 for(const name of ['RivoScan_Scans.txt','RivoScan_Scans.xlsx','RivoScan_Plates.txt','RivoScan_Plates.xlsx'])
  assert.ok(java.includes(name));
 assert.ok(java.includes('upsertScannerLog'));
 assert.ok(java.includes('Not an approved scanner log.'));
 assert.ok(java.includes('MediaStore.MediaColumns.RELATIVE_PATH'));
});
test('Tools are wired and camera overlays stop streaming on close or Android Back',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const tools=readFileSync(new URL('../src/tools-hub.js',import.meta.url),'utf8');
 const qr=readFileSync(new URL('../src/barcode-scanner.js',import.meta.url),'utf8');
 const plates=readFileSync(new URL('../src/plate-scanner.js',import.meta.url),'utf8');
 assert.ok(tools.includes("plateScanner:{icon:'scan'"));
 assert.ok(main.includes("spec.type==='plates'"));
 assert.ok(main.includes("scanLedger.append('plates'"));
 assert.ok(main.includes("scanLedger.append('codes'"));
 assert.ok(qr.includes('decodeFromVideoElement'));
 assert.ok(qr.includes('stream.getTracks()')||qr.includes('streams.push'));
 assert.ok(plates.includes('stream?.getTracks().forEach(t=>t.stop())'));
 assert.ok(main.includes("document.querySelector('.rivo-live-overlay [data-scan-overlay-close]')"));
});
