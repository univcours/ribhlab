import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
const css=readFileSync(new URL('../src/rivo-ui-04567.css',import.meta.url),'utf8');
test('all modal action buttons receive colored high contrast semantic styles',()=>{
 const ast=postcss.parse(css,{from:'rivo-ui-04567.css'});
 assert.ok(ast.nodes.length>4);
 for(const label of ['import','camera','crop','ai-','save','delete']){
  assert.ok(css.includes('[class*="'+label+'"]'),'Missing semantic '+label);
 }
 for(const color of ['#9160ec','#149aef','#16b4cf','#f3a436','#12b88b','#ed6070']){
  assert.ok(css.includes(color),'Missing accent '+color);
 }
 assert.match(css,/button:is\(:disabled,\[aria-disabled="true"\]\)/);
 assert.match(css,/opacity:1!important/);
 assert.match(css,/\.rivo-workspace-task/);
 assert.match(css,/\.rivo-id-dialog/);
 assert.match(css,/\.rivo-code-dialog/);
});
