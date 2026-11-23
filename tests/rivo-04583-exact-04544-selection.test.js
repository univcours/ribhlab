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
  'data-doc-external','data-doc-shield','data-doc-edges',
  'data-doc-share','data-doc-rename','data-doc-delete'
 ];
 const actionSection=rows.slice(rows.indexOf('class="document-buttons rivo-file-quick-actions"'));
 let last=-1;
 for(const x of expected){
  const current=actionSection.indexOf(x);
  assert.ok(current>last,'Selection action/order missing: '+x);
  last=current;
 }
 assert.equal((rows.match(/class="document-buttons rivo-file-quick-actions"/g)||[]).length,1);
 assert.match(rows,/data-thumb-uri/);
 assert.match(rows,/bulkUI\.checkbox\(item,index\)/);
});
test('0.45.44 multi-select options remain without long-press actions',()=>{
 const section=bulk.split('function toolbar()')[1].split('const isImage=')[0];
 const actions=['cancel','all','delete','organize','merge','share'];
 let prev=-1;
 for(const x of actions){const idx=section.indexOf("compactAction('"+x+"'");assert.ok(idx>prev,x);prev=idx}
 assert.match(bulk,/if\(!mode\|\|selected\.size<2\)return ''/);
 assert.doesNotMatch(bulk,/function longPress\(|function wireLongPress\(|setTimeout\(\(\)=>|contextmenu|suppressUntil/);
 assert.doesNotMatch(main,/bulkUI\.wireLongPress\(|bulkUI\.suppressClick\(/);
 assert.match(main,/bulkUI\.toggle\(libraryItems\[Number\(target\.dataset\.docSelect\)\]\)/);
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

test('thumbnail fills entire frame with no padding and no letterboxing',()=>{
 const box=css.split('/* Exact thumbnail bounds, both selected and normal file cards.')[1];
 assert.ok(box,'Missing fill-frame thumbnail layout');
 assert.match(box,/padding:0!important/);
 assert.match(box,/object-fit:cover!important/);
 assert.match(box,/overflow:hidden!important/);
 assert.match(box,/width:100%!important/);
 assert.match(box,/height:100%!important/);
 assert.match(box,/:is\(#home-recents,#library-list\)/);
});
