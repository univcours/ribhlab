import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toolGroups,hubSpecial,hubLanguages,hubLabel} from '../src/tools-hub.js';
import {homeTiles} from '../src/premium-home-model.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),bulk=read('src/library-bulk.js'),css=read('src/premium-home.css');

test('Every home shortcut is accessible without a hidden More Tools panel',()=>{
 assert.equal(homeTiles.length,9);
 assert.ok(main.includes('<details class="rivo-scan-more-tools" open>'));
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
test('All six single-file buttons show translated multiline text, not icons alone',()=>{
 for(const action of ['share','edit','preview','rename','delete','add']){
  const at=bulk.indexOf('data-doc-'+action+'="'+'$'+'{index}"');
  assert.ok(at>=0,action+' missing');
  const segment=bulk.slice(at,at+390);
  assert.ok(segment.includes('class="rivo-action-icon"'),action+' missing icon');
  assert.ok(segment.includes('class="rivo-action-label"'),action+' missing full label');
 }
 assert.equal((bulk.match(/class="rivo-action-label"/g)||[]).length,6);
 assert.ok(css.includes('portrait button restoration'));
 assert.ok(css.includes('grid-auto-rows:minmax(114px,auto)!important'));
 assert.ok(css.includes('aspect-ratio:4/5!important'));
 assert.ok(css.includes('text-overflow:clip!important'));
});
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
