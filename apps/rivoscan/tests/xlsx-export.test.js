import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createOCRWorkbook,excelColumnName} from '../src/xlsx-export.js';
test('Excel A..ZZ, strings and special characters round-trip into a real OOXML XLSX', async()=>{
 assert.equal(excelColumnName(0),'A');assert.equal(excelColumnName(25),'Z');
 assert.equal(excelColumnName(26),'AA');assert.equal(excelColumnName(701),'ZZ');
 const bytes=await createOCRWorkbook([['Reference','Amount'],['00123','=HYPERLINK("x")'],['A & B','ختم < واضح']]);
 const zip=await JSZip.loadAsync(bytes);
 assert.ok(zip.file('xl/workbook.xml'));assert.ok(zip.file('xl/_rels/workbook.xml.rels'));
 assert.ok(zip.file('[Content_Types].xml'));
 const xml=await zip.file('xl/worksheets/sheet1.xml').async('string');
 assert.ok(xml.includes('A2" t="inlineStr"'));
 assert.ok(xml.includes('00123'));
 assert.ok(xml.includes('=HYPERLINK'));
 assert.ok(xml.includes('A &amp; B'));
 assert.ok(xml.includes('ختم &lt; واضح'));
 assert.ok(!xml.includes('<f>'), 'OCR strings must never execute as formulas');
});
test('Excel export rejects impossible widths and empty documents', async()=>{
 assert.throws(()=>excelColumnName(16384));
 await assert.rejects(createOCRWorkbook([]));
 await assert.rejects(createOCRWorkbook([Array.from({length:257},(_,i)=>String(i))]));
});
