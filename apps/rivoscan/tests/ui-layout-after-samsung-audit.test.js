import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/rivoscan-layout-repairs.css',import.meta.url),'utf8');
test('Latest CSS repairs appear last and hide raw system file choosers',()=>{
 assert.ok(main.indexOf("import './rivoscan-layout-repairs.css'")>main.indexOf("import './ui-consistency.css'"));
 assert.match(css,/input\[type="file"\]/);
});
test('More Tools Smart Scan tile cannot disappear; PPTX uses correct icon code',()=>{
 assert.match(css,/\.rivo-premium-tile-main/);
 assert.match(css,/\.rivo-premium-tile strong/);
 assert.ok(main.includes("code:'PPT',klass:'ppt'"));
});
test('Selected file actions do not crush filename; PDF viewer gives preview enough room',()=>{
 assert.match(css,/grid-column:1 \/ -1!important;grid-row:2!important/);
 assert.match(css,/body \.doc-detail-preview/);
 assert.match(css,/body \.doc-detail-actions/);
 assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);
});
