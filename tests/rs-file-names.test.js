import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRsFileNamer,rsDay,rsTimestamp,rsFileKind} from '../src/rs-file-names.js';
import {scannerDailyFile} from '../src/scan-ledger.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('new scans have compact, local-date RS names and correct extensions',()=>{
 const clock=()=>new Date(2026,10,15,14,25,9,73);
 const name=createRsFileNamer({clock});
 assert.equal(rsDay(clock()),'20261115');
 assert.equal(rsTimestamp(clock()),'20261115_142509_073');
 assert.equal(name('RivoScan_Scan_1794743109073.pdf'),'RS_Doc_20261115_142509_073.pdf');
 assert.equal(name('Camera.jpg'),'RS_Img_20261115_142509_073_1.jpg');
 assert.equal(name('ExtractText_123.txt'),'RS_OCR_20261115_142509_073_2.txt');
 assert.equal(name('SomeTable.xlsx'),'RS_Xls_20261115_142509_073_3.xlsx');
 assert.equal(rsFileKind('Presentation.pptx'),'Slides');
});

test('already formatted RS documents remain untouched and original imports are not rewritten',()=>{
 const next=createRsFileNamer({clock:()=>new Date(2026,10,15,14,25,9,73)});
 const original='RS_Doc_20261115_142509_073.pdf';
 assert.equal(next(original),original);
 const main=read('src/main.js');
 assert.match(main,/RivoDocuments\.saveFile\(\{name:file\.name,mimeType:file\.type/);
 assert.match(main,/const safe=generatedRsName\(/);
 assert.match(read('src/mlkit-scan-flow.js'),/createRsFileNamer/);
});

test('QR and barcodes append to two permanent RS TXT journals',()=>{
 assert.equal(scannerDailyFile('QR','2026-11-15'),'RS_QR.txt');
 assert.equal(scannerDailyFile('EAN13','2026-11-15'),'RS_Bar.txt');
 const java=read('native/android/RivoDocumentsPlugin.java');
 assert.match(java,/appendScannerText/);
 assert.ok(java.includes('RS_QR.txt')&&java.includes('RS_Bar.txt'));
});

test('in-place actions are eye/share/pencil/trash, thumbnails stay enabled',()=>{
 const main=read('src/main.js');
 for(const id of ['data-doc-open','data-doc-share','data-doc-rename','data-doc-delete']){
  assert.ok(main.includes(id));
 }
 assert.equal(main.split("ico('share',17)").length-1,2);
 assert.equal(main.split("ico('pencil',17)").length-1,2);
 assert.equal(main.split("ico('trash',17)").length-1,2);
 assert.equal(main.split('data-thumb-uri=').length-1,2);
 assert.ok(main.includes('RivoDocuments.getThumbnail'));
 assert.ok(main.includes('rivo-file-type-icon'));
 const css=read('src/rivo-file-icons.css');
 assert.ok(css.includes('rivo-file-quick-actions'));
 assert.ok(css.includes('rivo-file-thumb img'));
 assert.ok(css.includes('rivo-file-qr'));
 assert.ok(css.includes('rivo-file-barcode'));
});
