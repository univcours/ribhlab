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
