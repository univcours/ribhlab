import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {materialSymbol} from '../src/material-symbols.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('non-previewable TXT/Word/Excel/PDF fallback has legible icon and explicit type badge',()=>{
 const main=source('src/main.js'),css=source('src/rivo-file-icons-04590.css');
 assert.match(main,/const file=visualFileType\(item\)/);
 assert.match(main,/ico\(file\.symbol,38\)/);
 assert.match(main,/rivo-file-extension/);
 assert.match(main,/escapeHTML\(file\.code\)/);
 assert.match(main,/klass:'txt',symbol:'filelines'/);
 assert.match(main,/klass:'pdf',symbol:'pdf'/);
 assert.match(materialSymbol('filelines',38),/data-material-symbol="article"/);
 assert.match(materialSymbol('pdf',38),/data-material-symbol="picture_as_pdf"/);
 for(const name of ['pdf','txt','doc','xls','zip','image','qr','barcode']){
  assert.match(css,new RegExp('rivo-file-'+name));
 }
 assert.match(css,/font-size:38px!important/);
 assert.match(css,/font-variation-settings:'FILL' 1/);
});
test('real imported and scanned PDF/image thumbnails are not painted over',()=>{
 const css=source('src/rivo-file-icons-04590.css'),main=source('src/main.js');
 assert.match(css,/:not\(:has\(img\)\)/);
 assert.match(css,/:has\(img\) > :is\(\.rivo-file-type-icon,\.rivo-file-extension\)/);
 assert.match(main,/replaceChildren\(img\)/);
 assert.match(main,/getThumbnail\(\{uri,width:136,height:184\}\)/);
 assert.match(main,/data-thumb-uri=/);
});
test('extra landscape constraint preserves My Files scrolling above bottom nav',()=>{
 const css=source('src/rivo-file-icons-04590.css');
 assert.match(css,/@media\(max-height:430px\) and \(orientation:landscape\)/);
 assert.match(css,/\.app-home\.rivo-home\.rivo-compact-home/);
 assert.match(css,/overflow-y:auto!important/);
});
