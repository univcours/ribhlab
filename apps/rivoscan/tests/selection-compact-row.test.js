import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const L=read('src/library-bulk.js'),M=read('src/main.js'),CSS=read('src/selection-compact.css');
test('One selected document has exactly five compact actions and one combined Edit/Rename button',()=>{
 const segment=L.slice(L.indexOf('const actions=`<div class="rivo-selection-inline'),L.indexOf("row.insertAdjacentHTML('beforeend',actions)"));
 assert.equal((segment.match(/<button type="button"/g)||[]).length,5);
 assert.match(segment,/data-doc-edit-rename="\$\{index\}"/);
 assert.doesNotMatch(segment,/data-doc-rename=|data-doc-edit="/);
 assert.match(segment,/data-doc-share=|data-doc-preview=|data-doc-delete=|data-doc-add=/);
 assert.match(segment,/rivo-add-plus">\+<\/span>/);
});
test('Edit/Rename button offers both functional actions via existing callbacks',()=>{
 assert.match(L,/function editRenameOne\(doc\)/);
 assert.match(L,/data-edit-rename-choice="edit"/);
 assert.match(L,/data-edit-rename-choice="rename"/);
 assert.match(L,/await onEdit\?\.\(doc\)/);
 assert.match(L,/await onRename\?\.\(doc\)/);
 assert.match(M,/data-doc-edit-rename/);
 assert.match(M,/bulkUI\.editRenameOne\(doc\)/);
});
test('Two or more documents use a single one-line accessible menu with all actions',()=>{
 const t=L.slice(L.indexOf('function toolbar(){'),L.indexOf('const isImage=doc=>'));
 assert.match(t,/selected\.size<2/);
 assert.equal((t.match(/data-bulk="/g)||[]).length,7);
 for(const action of ['share','organize','merge','delete','all','invert','cancel'])assert.ok(t.includes(`data-bulk="${action}"`));
 assert.match(CSS,/\.bulk-actions\.rivo-bulk-icon-row/);
 assert.match(CSS,/flex-wrap:nowrap!important/);
 assert.match(CSS,/position:static!important/);
});
test('One-line actions are to the right of the filename, not in another row',()=>{
 assert.ok(M.includes("import './selection-compact.css';"));
 assert.match(CSS,/grid-template-columns:24px minmax\(0,1fr\) auto!important/);
 assert.match(CSS,/grid-column:3!important;grid-row:1!important/);
 assert.match(CSS,/rivo-file-thumb[\s\S]*?display:none!important/);
});
