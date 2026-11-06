import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDocumentSearch,documentKind,matchesDocument} from '../src/document-search.js';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('French accent-insensitive search preserves original document names',()=>{
 const item={name:'Facturé Été 2026.PDF'};
 assert.ok(matchesDocument(item,{query:'facture ete',filter:'pdf'}));
 assert.equal(item.name,'Facturé Été 2026.PDF');
 assert.ok(matchesDocument({name:'RÉSUMÉ.docx'},{query:'resume'}));
});
test('Arabic search ignores harakat and tatweel without altering stored name',()=>{
 const item={name:'مُسْتَنَد_العَقْد.pdf'};
 assert.ok(matchesDocument(item,{query:'مستند'}));
 assert.ok(matchesDocument({name:'الــوثيقة.pdf'},{query:'الوثيقة'}));
 assert.equal(normalizeDocumentSearch('إيصال').length>0,true);
});
test('PDF and images can be filtered even with missing or generic MIME',()=>{
 assert.equal(documentKind({name:'scan.PDF',mimeType:'application/octet-stream'}),'pdf');
 assert.equal(documentKind({name:'photo.HEIC',mimeType:''}),'images');
 assert.equal(documentKind({name:'photo.jpg',mimeType:'application/octet-stream'}),'images');
 assert.equal(documentKind({name:'note.txt'}),'other');
 assert.ok(matchesDocument({name:'scan.pdf'},{filter:'pdf'}));
 assert.ok(matchesDocument({name:'photo.jpg'},{filter:'images'}));
 assert.ok(!matchesDocument({name:'photo.jpg'},{filter:'pdf'}));
 assert.ok(!matchesDocument({name:'notes.docx'},{filter:'images'}));
});
test('Unknown names and empty queries are safe; both screens use shared matcher',()=>{
 assert.ok(matchesDocument({name:'Scan.PDF'}));
 assert.equal(matchesDocument(null),false);
 assert.equal(matchesDocument({name:null},{query:'scan'}),false);
 assert.ok(main.includes('matchesDocument(doc,{query:needle})'));
 assert.ok(main.includes('matchesDocument(item,{query:needle,filter:libraryFilter})'));
});

test('Search matches filename words separated by underscores, hyphens or punctuation in any order',()=>{
 const item={name:'Invoice_2026-11_client.pdf'};
 assert.ok(matchesDocument(item,{query:'client invoice',filter:'pdf'}));
 assert.ok(matchesDocument(item,{query:'2026 invoice',filter:'pdf'}));
 assert.ok(matchesDocument(item,{query:'invoice client 11',filter:'pdf'}));
 assert.ok(!matchesDocument(item,{query:'invoice supplier',filter:'pdf'}));
 assert.ok(!matchesDocument(item,{query:'invoice',filter:'images'}));
 assert.equal(item.name,'Invoice_2026-11_client.pdf');
});
test('Arabic alef/hamza variants and whitespace are normalized for search only',()=>{
 const item={name:'إيصال_أداء-آجل.pdf'};
 assert.ok(matchesDocument(item,{query:'ايصال اداء'}));
 assert.ok(matchesDocument(item,{query:'آجل   إيصال'}));
 assert.equal(item.name,'إيصال_أداء-آجل.pdf');
 assert.equal(normalizeDocumentSearch('  فَاتُورَة___2026  '),'فاتورة 2026');
});

test('Arabic and Eastern Arabic-Indic invoice digits match ASCII without renaming files',()=>{
 const arabic={name:'فاتورة_٢٠٢٦_١٢٣.pdf'};
 const eastern={name:'رسيد_۲۰۲۶_۱۲۳.pdf'};
 assert.ok(matchesDocument(arabic,{query:'فاتورة 2026 123',filter:'pdf'}));
 assert.ok(matchesDocument(arabic,{query:'فاتورة ۲۰۲۶'}));
 assert.ok(matchesDocument(eastern,{query:'رسيد ٢٠٢٦ 123'}));
 assert.ok(!matchesDocument(arabic,{query:'2027'}));
 assert.equal(arabic.name,'فاتورة_٢٠٢٦_١٢٣.pdf');
 assert.equal(normalizeDocumentSearch('۱۲٣٤'), '1234');
});
