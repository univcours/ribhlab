import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js');
const bulk=read('src/library-bulk.js');
const css=read('src/rivo-selection-04544-04583.css');

test('Home and My Documents render EXACT same original 0.45.44 single-file actions',()=>{
 assert.match(main,/function renderSavedFileRow\(item,index\)/);
 assert.match(main,/matched\.map\(\(\{doc,index\}\)=>renderSavedFileRow\(doc,index\)\)/);
 assert.match(main,/matched\.map\(\(\{item,index\}\)=>renderSavedFileRow\(item,index\)\)/);
 const rows=main.split('function renderSavedFileRow(item,index)')[1].split('function recentDocuments(')[0];
 assert.match(rows,/const single=bulkUI\.chosen\(item\)&&bulkUI\.count\(\)===1/);
 const expected=[
  'data-doc-open','data-doc-shield','data-doc-edges',
  'data-doc-share','data-doc-rename','data-doc-delete'
 ];
 const actionSection=rows.slice(rows.indexOf('class="document-buttons rivo-file-quick-actions"'));
 let last=-1;
 for(const x of expected){
  const current=actionSection.indexOf(x);
  assert.ok(current>last,'0.45.44 action/order missing or changed: '+x);
  last=current;
 }
 assert.equal((rows.match(/class="document-buttons rivo-file-quick-actions"/g)||[]).length,1);
 assert.match(rows,/data-thumb-uri/);
 assert.match(rows,/bulkUI\.checkbox\(item,index\)/);
});
test('0.45.44 multi-select options and long-press menu keep original operations',()=>{
 const section=bulk.split('function toolbar()')[1].split('const isImage=')[0];
 const actions=['cancel','all','delete','organize','merge','share'];
 let prev=-1;
 for(const x of actions){const idx=section.indexOf("compactAction('"+x+"'");assert.ok(idx>prev,x);prev=idx}
 assert.match(bulk,/if\(!mode\|\|selected\.size<2\)return ''/);
 const long=bulk.split('function longPress(doc)')[1].split('function wireLongPress(')[0];
 for(const x of ['preview','edit','share','delete','rename','copy','select'])
  assert.ok(long.includes('data-menu="'+x+'"'),x);
});
test('0.45.44 selection options remain next to current thumbnail in BOTH lists',()=>{
 assert.match(main,/import '\.\/rivo-selection-04544-04583\.css'/);
 assert.match(css,/:is\(#home-recents,#library-list\)/);
 assert.match(css,/flex-direction:row!important/);
 assert.match(css,/flex-wrap:nowrap!important/);
 assert.match(css,/overflow-x:auto!important/);
 assert.match(css,/width:29px!important/);
 assert.match(css,/height:34px!important/);
 assert.match(css,/height:72px!important/);
 assert.match(css,/height:66px!important/);
});
