import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/turquoise-v2.css', import.meta.url),'utf8');
const src=readFileSync(new URL('../src/library-bulk.js', import.meta.url),'utf8');
const rules=css.slice(css.indexOf('/* Selected file: right-side yellow vertical actions'));

test('single checked document has six original bound actions on its right side',()=>{
  assert.ok(rules.startsWith('/* Selected file: right-side yellow vertical actions'));
  assert.match(src,/if\(mode&&selected\.size===1&&doc&&chosen\(doc\)\)/);
  for(const attr of ['share','edit','preview','rename','delete','add'])assert.ok(src.includes('data-doc-'+attr+'="${index}"'),'Missing action '+attr);
  assert.match(rules,/grid-template-columns:25px 39px minmax\(0,1fr\) minmax\(96px,108px\)!important/);
  assert.match(rules,/grid-column:4!important/);
  assert.match(rules,/flex-direction:column!important/);
  assert.match(rules,/aspect-ratio:auto!important/);
  assert.match(rules,/#fff4c8/);
  assert.match(rules,/#ffe29a/);
  assert.doesNotMatch(rules,/aspect-ratio:4\/5!important/);
});

test('multi-select retains its distinct bulk-action bar',()=>{
  assert.match(src,/selected\.size>=2/);
  assert.match(src,/function toolbar\(\)\{\s*if\(!mode\|\|selected\.size<2\)return ''/);
  assert.match(src,/data-bulk="share"/);
  assert.match(src,/data-bulk="delete"/);
  assert.match(src,/function checkbox\(doc,index\)/);
});
