import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toolGroups,hubSpecial,hubLanguages,hubLabel} from '../src/tools-hub.js';
import {homeTiles} from '../src/premium-home-model.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),bulk=read('src/library-bulk.js'),css=read('src/premium-home.css');

test('Every home shortcut is accessible through native collapsed More Tools and Tools directory',()=>{
 assert.equal(homeTiles.length,9);
 assert.ok(main.includes('<details class="rivo-scan-more-tools">'));
 assert.ok(main.includes('<summary><span class="rivo-scan-more-icon"'));
 assert.ok(main.includes('data-tab="tools" class="rivo-scan-all-tools"'));
 assert.ok(css.includes('.rivo-scan-more-tools[open] .rivo-premium-tools'));
});
test('Tools tab preserves every category, route and localized label',()=>{
 assert.deepEqual(toolGroups.map(g=>g.id),['scan','import','convert','edit','utilities']);
 const ids=toolGroups.flatMap(g=>g.entries);
 assert.ok(ids.length>=40);
 assert.equal(ids.length,new Set(ids).size);
 assert.ok(main.includes('data-hub-action="'+'$'+'{id}"'));
 assert.ok(main.includes('async function openHubAction(id)'));
 assert.ok(main.includes('if(!spec){await openTool(id);return;}'));
 for(const id of ids){
  assert.ok(hubSpecial[id]||main.includes('await openTool(id)'),id+' missing route');
  for(const lang of hubLanguages()) assert.ok(hubLabel(lang,id,id),lang+':'+id);
 }
});
test('five icon controls expose meaningful localized accessibility labels',()=>{const css=read('src/selection-compact.css');for(const k of ['share','preview','delete','add']){const at=bulk.indexOf('data-doc-'+k+'=');assert.ok(at>=0,k);const snippet=bulk.slice(at,at+390);assert.ok(snippet.includes('aria-label='),k);assert.ok(snippet.includes('rivo-action-icon'),k);}for(const k of ['data-doc-edit-rename=','data-edit-rename-choice="rename"','data-edit-rename-choice="edit"'])assert.ok(bulk.includes(k),k);assert.ok(css.includes('flex-wrap:nowrap!important'));});

test('All seven bulk actions remain readable above the bottom camera navigation',()=>{
 for(const action of ['share','delete','organize','merge','all','invert','cancel'])
  assert.ok(bulk.includes('data-bulk="'+action+'"'),action);
 assert.ok(css.includes('bottom:calc(125px + env(safe-area-inset-bottom,0px))!important'));
 assert.ok(css.includes('grid-auto-rows:minmax(100px,auto)!important'));
 assert.ok(css.includes('white-space:normal!important'));
});
test('Per-file checkboxes and document viewer handlers remain intact',()=>{
 assert.ok(bulk.includes('class="doc-select-box"'));
 assert.ok(main.includes('openRivoDocument(selected)'));
 for(const action of ['share','edit','preview','rename','delete','add'])
  assert.ok(main.includes('data-doc-'+action),action);
 assert.ok(!main.includes('bulkUI.wireLongPress(el)'));
});
