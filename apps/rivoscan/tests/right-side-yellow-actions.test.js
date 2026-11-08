import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/turquoise-v2.css', import.meta.url),'utf8');
const src=readFileSync(new URL('../src/library-bulk.js', import.meta.url),'utf8');
const rules=css.slice(css.indexOf('/* Selected file: right-side yellow vertical actions'));

test('one checked file keeps five right-aligned turquoise icon actions',()=>{const compact=readFileSync(new URL('../src/selection-compact.css',import.meta.url),'utf8');assert.ok(src.includes('if(mode&&selected.size===1&&doc&&chosen(doc))'));for(const a of ['share','preview','delete','add'])assert.ok(src.includes('data-doc-'+a+'='),a);assert.ok(src.includes('data-doc-edit-rename='));for(const k of ['flex-wrap:nowrap!important','justify-content:flex-end!important','height:38px!important'])assert.ok(compact.includes(k),k);});

test('multi-select retains its distinct bulk-action bar',()=>{
  assert.match(src,/selected\.size>=2/);
  assert.match(src,/function toolbar\(\)\{\s*if\(!mode\|\|selected\.size<2\)return ''/);
  assert.match(src,/data-bulk="share"/);
  assert.match(src,/data-bulk="delete"/);
  assert.match(src,/function checkbox\(doc,index\)/);
});
