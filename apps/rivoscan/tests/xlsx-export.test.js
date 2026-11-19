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

test('Each PDF page becomes a separate editable XLSX worksheet, with safe text and visible columns',async()=>{
 const input={pages:[
  {name:'Page 1',rows:[['Product','Amount'],['001234','=SUM(1+1)']]},
  {name:'Page 2',rows:[['شركة & Group','€ 2,000'],['A','ختم < واضح']]}
 ]};
 const bytes=await createOCRWorkbook(input);
 const zip=await JSZip.loadAsync(bytes);
 const wb=await zip.file('xl/workbook.xml').async('string');
 const rels=await zip.file('xl/_rels/workbook.xml.rels').async('string');
 const types=await zip.file('[Content_Types].xml').async('string');
 const first=await zip.file('xl/worksheets/sheet1.xml').async('string');
 const second=await zip.file('xl/worksheets/sheet2.xml').async('string');
 assert.ok(wb.includes('name="Page 1"')&&wb.includes('name="Page 2"'));
 assert.ok(rels.includes('Target="worksheets/sheet2.xml"'));
 assert.ok(types.includes('/xl/worksheets/sheet2.xml'));
 assert.ok(first.includes('001234')&&first.includes('=SUM(1+1)')&&!first.includes('<f>'));
 assert.ok(second.includes('شركة &amp; Group')&&second.includes('ختم &lt; واضح'));
 assert.ok(first.includes('<cols>')&&second.includes('<cols>'));
});
test('Worksheet names are sanitized and duplicated names receive distinct suffixes',async()=>{
 const bytes=await createOCRWorkbook({pages:[
  {name:'A/B?',rows:[['one']]},{name:'A/B?',rows:[['two']]}
 ]});
 const zip=await JSZip.loadAsync(bytes);
 const wb=await zip.file('xl/workbook.xml').async('string');
 assert.ok(wb.includes('name="AB"'));assert.ok(wb.includes('name="AB 2"'));
 await assert.rejects(createOCRWorkbook({pages:[{name:'empty',rows:[]}]}));
 await assert.rejects(createOCRWorkbook({pages:Array.from({length:26},()=>({rows:[['ok']]}))}));
});
test('PDF-to-Excel code preserves each PDF page when exporting XLSX',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../src/tool-exports.js',import.meta.url),'utf8');
 assert.ok(code.includes("sheetPages.push({name:'Page '+i,rows:pageRows})"));
 assert.ok(code.includes('createOCRWorkbook({pages:sheetPages})'));
});
