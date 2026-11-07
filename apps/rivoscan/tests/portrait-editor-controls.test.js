import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Camera editor keeps all actions tappable, tall and scrollable',()=>{
 const editor=read('src/scan-editor.js');
 const css=read('src/premium-home.css');
 for(const id of ['compare','left','right','crop','ocr','eraser','date','save']){
  assert.ok(editor.includes('data-edit="'+id+'"'),id+' edit action missing');
 }
 assert.ok(css.includes('.rivo-editor-actions{'));
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'));
 assert.ok(css.includes('max-height:min(38dvh,320px)!important'));
 assert.ok(css.includes('overflow-y:auto!important'));
 assert.ok(css.includes('.rivo-editor-actions button{'));
});
test('PDF viewer and page manager actions remain accessible with full labels',()=>{
 const doc=read('src/document-viewer.js');
 const pages=read('src/page-manager.js');
 const css=read('src/premium-home.css');
 assert.ok(doc.includes('doc-detail-actions'));
 for(const id of ['select','left','right','delete','restore','undo','save']){
  assert.ok(pages.includes('data-page-action="'+id+'"'),id+' page-manager action missing');
 }
 assert.ok(css.includes('.doc-detail-actions .doc-action{'));
 assert.ok(css.includes('.rivo-page-operations button{'));
 assert.ok(css.includes('aspect-ratio:4/5!important'));
});
