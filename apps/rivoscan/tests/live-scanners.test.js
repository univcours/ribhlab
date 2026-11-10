import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createScanLedger,scannerLogNames} from '../src/scan-ledger.js';
import {normalizePlate,plateCandidates,matchesPlate,matchingPlateTargets,plateOcrLines,plateBoxInView} from '../src/plate-scanner.js';
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
test('Startup log recovery cannot overwrite a concurrently appended barcode',async()=>{
 const bridgeWrites=[], storage=memory();
 let release;
 const gate=new Promise(resolve=>{release=resolve;});
 let stalled=false;
 const bridge={upsertScannerLog:async data=>{
  if(!stalled){stalled=true;await gate;}
  bridgeWrites.push({name:data.name,text:Buffer.from(data.base64,'base64').toString('utf8')});
 }};
 const db=createScanLedger({bridge,storage,clock:()=>new Date('2026-11-09T10:00:00Z')});
 const first=db.append('codes',{value:'111111',format:'QR'});
 // Recovery enqueued while a file upsert is in flight, then another scan.
 const recovery=db.resync('codes');
 const second=db.append('codes',{value:'222222',format:'QR'});
 release();
 await Promise.all([first,recovery,second]);
 assert.equal(db.read('codes').length,2);
 const finalTxt=bridgeWrites.filter(entry=>entry.name==='RivoScan_Scans.txt').at(-1).text;
 assert.ok(finalTxt.includes('111111')&&finalTxt.includes('222222'));
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
test('Multiple locally pinned plate targets match while scanning unrelated plates',()=>{
 assert.deepEqual(matchingPlateTargets('12345-A-6',['999','12345','45A6','12345']),['12345','45A6']);
 assert.deepEqual(matchingPlateTargets('12345-A-6',['8888','9999']),[]);
 assert.deepEqual(matchingPlateTargets('12345-A-6',['12']),[]);
});
test('Tesseract v6 OCR blocks project true plate bounds through video cover cropping',()=>{
 const lines=plateOcrLines([{paragraphs:[{lines:[
  {text:'12345-A-6',bbox:{x0:200,y0:70,x1:360,y1:100}}
 ]}]}]);
 assert.equal(lines[0].text,'12345-A-6');
 const box=plateBoxInView(lines[0].bbox,
  {x:100,y:100,w:800,h:400,canvasWidth:1000},
  1,{width:1000,height:500},{width:500,height:250});
 assert.deepEqual(box,{x:150,y:85,width:80,height:15});
 assert.equal(plateBoxInView(null,{x:0,y:0,canvasWidth:100},1,{width:100,height:100},{width:100,height:100}),null);
});
test('Live reader prevents repeated scans for one continuously visible code',()=>{
 let tick=0;
 const d=newScanDeduplicator({clock:()=>tick,gapMs:1500});
 assert.equal(d.accept('QR\\u0000ABC'),true);
 tick+=500;assert.equal(d.accept('QR\\u0000ABC'),false);
 tick+=2000;assert.equal(d.accept('QR\\u0000ABC'),false,
  'same code in continuous view cannot auto-save every two seconds');
 assert.equal(d.accept('EAN13\\u0000ABC'),true,
  'different barcode format is a distinct symbol');
 assert.equal(d.accept('QR\\u0000ABC'),false,
  'alternating QR and barcode frames cannot repeatedly export the same code');
 assert.equal(d.accept('EAN13\\u0000ABC'),false,
  'second barcode remains deduplicated even while QR is visible');
 tick+=100;d.absence();
 tick+=1600;d.absence();
 assert.equal(d.accept('QR\\u0000ABC'),true,
  'returning after sustained absence is a fresh scan');
 assert.equal(d.accept('QR\\u0000ABC'),false);
 assert.equal(d.accept(''),false);
 assert.equal(decodeFormat({getBarcodeFormat:()=>11}),'QR');
 assert.equal(safeScannedUrl('javascript:alert(1)'),null);
 assert.equal(safeScannedUrl('https://example.org/'),'https://example.org/');
});
test('Plate match alert is backed by Android ToneGenerator rather than WebAudio alone',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const camera=readFileSync(new URL('../src/plate-scanner.js',import.meta.url),'utf8');
 const java=readFileSync(new URL('../native/android/RivoSounds.java',import.meta.url),'utf8');
 assert.ok(main.includes("RivoLiveScanner.playFeedback({kind:'plateMatch'})"));
 assert.ok(camera.includes('onMatchAlert(plate)'));
 assert.ok(java.includes('"plateMatch".equals(event)'));
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

test('QR and barcode share one button, auto-detect live, frame ONLY detected symbols, and never photograph empty frames',()=>{
 const source=readFileSync(new URL('../src/barcode-scanner.js',import.meta.url),'utf8');
 const hub=readFileSync(new URL('../src/tools-hub.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/compact-turquoise.css',import.meta.url),'utf8');
 assert.equal((hub.match(/scanCode:\{icon:/g)||[]).length,1);
 assert.ok(hub.includes("scanCode:{icon:'scan',color:'green',type:'barcode'}"));
 assert.ok(main.includes("spec.type==='barcode'"));
 assert.ok(source.includes('decodeFromVideoElement(video'));
 assert.ok(source.includes("recognizedCode(decoded)"));
 assert.ok(source.includes("if(!entry)return"));
 assert.ok(source.includes("if(!valid.length)return false"));
 assert.ok(source.includes("const saved=await onScan(entry)"));
 assert.ok(!source.includes('Camera.getPhoto('));
 assert.ok(!source.includes('canvas.toBlob('));
 assert.ok(source.includes('drawOutline(outline,video,decoded.getResultPoints?.()||[])'));
 assert.ok(source.includes("if(lastDetectionAt&&Date.now()-lastDetectionAt>1700)"));
 assert.ok(css.includes('rivo-code-success-frame'));
});
test('Detected symbol must have nonempty text AND a recognized QR/barcode format',async()=>{
 const {recognizedCode}=await import('../src/barcode-scanner.js');
 assert.deepEqual(recognizedCode({getText:()=> ' https://example.org ',getBarcodeFormat:()=>11}),
  {value:'https://example.org',format:'QR'});
 assert.deepEqual(recognizedCode({getText:()=> '6111234567890',getBarcodeFormat:()=>7}),
  {value:'6111234567890',format:'EAN13'});
 assert.equal(recognizedCode(null),null);
 assert.equal(recognizedCode({getText:()=> '',getBarcodeFormat:()=>11}),null);
 assert.equal(recognizedCode({getText:()=> '123',getBarcodeFormat:()=>999}),null);
});
test('Native document shutter animates only after user capture and never adds automatic code photos',()=>{
 const native=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
 assert.ok(native.includes('private void animateShutterCapture()'));
 assert.ok(native.includes('captureInProgress=true;\n        animateShutterCapture();'));
 assert.ok(native.includes('shutterFlash.animate().alpha(0f).setDuration(240).start()'));
 assert.ok(native.includes('shutter.animate().scaleX(.83f).scaleY(.83f)'));
});

test('UltraScan frames reflect actual live symbols, never imported photo coordinates',()=>{
 const src=readFileSync(new URL('../src/barcode-scanner.js',import.meta.url),'utf8');
 assert.ok(src.includes('fromPhoto=false'));
 assert.ok(src.includes('await deliver(found,{fromPhoto:true})'));
 assert.ok(src.includes('lastDetectionAt=0;clearDetectionOutline()'));
 assert.ok(src.includes("entry.format+'\\u0000'+entry.value"));
 assert.ok(src.includes("dedup.absence();"));
 assert.ok(src.includes('if(drawOutline(outline,video'));
});
