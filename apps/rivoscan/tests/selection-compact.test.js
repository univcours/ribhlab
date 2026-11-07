import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Promotional ADS badges and test buttons removed, privacy choices remain',()=>{
 const main=read('src/main.js');
 assert.ok(!main.includes('>ADS<'));
 for(const key of ['data-ad-test','data-ad-retry','rivo-ai-compact','data-premium-unlock'])
  assert.ok(!main.includes(key),key);
 assert.ok(main.includes('data-ad-privacy'));
});
test('One PDF: six right-aligned small horizontal buttons, no filename overlap',()=>{
 const bulk=read('src/library-bulk.js'),css=read('src/premium-home.css');
 assert.ok(bulk.includes("if(!mode||selected.size<2)return '';"));
 assert.ok(bulk.includes("mode&&selected.size===1&&doc&&chosen(doc)"));
 for(const action of ['share','edit','preview','rename','delete','add'])
  assert.ok(bulk.includes('data-doc-'+action+'="${index}"'),action);
 assert.ok(css.includes('0.44.21: the selected file stays readable'));
 assert.ok(css.includes('flex-flow:row nowrap!important'));
 assert.ok(css.includes('justify-content:flex-end!important'));
 assert.ok(css.includes('grid-column:2/-1!important'));
});
test('Multi files: 7 actions in a horizontal row ABOVE the camera',()=>{
 const bulk=read('src/library-bulk.js'),css=read('src/premium-home.css');
 for(const id of ['share','delete','organize','merge','all','invert','cancel'])
  assert.ok(bulk.includes('data-bulk="'+id+'"'),id);
 assert.ok(css.includes('bottom:calc(172px + env(safe-area-inset-bottom,0px))!important'));
 assert.ok(css.includes('flex-flow:row nowrap!important'));
 const multi=bulk.slice(bulk.indexOf('function toolbar()'),bulk.indexOf('function checkbox('));
 assert.ok(!multi.includes('data-doc-add'),'no group plus button');
});
test('Home file filter buttons still navigate',()=>{
 const main=read('src/main.js');
 assert.ok(main.includes("libraryFilter=button.dataset.homeFilter;"));
 assert.ok(main.includes("document.querySelectorAll('[data-home-filter]').forEach(button=>button.addEventListener('click'"));
});
