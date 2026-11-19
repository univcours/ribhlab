import test from 'node:test';
import assert from 'node:assert/strict';
import {safeDocumentName,spreadsheetText} from '../src/file-safety.js';
test('Unicode document names are preserved and paths cannot escape storage',()=>{
 assert.equal(safeDocumentName('عقد_شراء_2026.pdf'),'عقد_شراء_2026.pdf');
 assert.equal(safeDocumentName('Réception été.pdf'),'Réception été.pdf');
 assert.equal(safeDocumentName('../secret\\client?.pdf'),'_secret_client_.pdf');
 assert.equal(safeDocumentName('   ...  '),'RivoScan.pdf');
 const long='ع'.repeat(150)+'.pdf';
 assert.equal(Array.from(safeDocumentName(long)).length,110);
 assert.ok(safeDocumentName(long).endsWith('.pdf'));
 assert.ok(!safeDocumentName('محضر\u202eexe.pdf').includes('\u202e'));
});
test('OCR formula-looking cells are safe in CSV and TSV',()=>{
 for(const candidate of ['=1+2',' +SUM(A1:A2)','-HYPERLINK("x")','@ref','\t=1+1'])
  assert.ok(spreadsheetText(candidate).startsWith("'"));
 assert.equal(spreadsheetText('Hello World'),'Hello World');
 assert.equal(spreadsheetText('محمد'),'محمد');
});
