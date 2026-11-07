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
test('One file: icons to the right, four actions',()=>{
 const bulk=read('src/library-bulk.js'),css=read('src/premium-home.css');
 assert.ok(bulk.includes("if(!mode||selected.size<2)return '';"));
 assert.ok(bulk.includes("mode&&selected.size===1&&doc&&chosen(doc)"));
 for(const action of ['data-doc-share','data-doc-savepdf','data-doc-preview','data-doc-delete'])
  assert.ok(bulk.includes(action),action);
 assert.ok(css.includes('grid-template-columns:1fr!important'));
});
test('Multi files: 7 actions above bottom camera and navigation',()=>{
 const bulk=read('src/library-bulk.js'),css=read('src/premium-home.css');
 for(const id of ['share','delete','organize','merge','all','invert','cancel'])
  assert.ok(bulk.includes('data-bulk="'+id+'"'),id);
 assert.ok(css.includes('top:clamp(144px,25vh,225px)!important'));
 assert.ok(css.includes('grid-template-columns:1fr!important'));
});
test('Home file filter buttons still navigate',()=>{
 const main=read('src/main.js');
 assert.ok(main.includes("libraryFilter=button.dataset.homeFilter;"));
 assert.ok(main.includes("document.querySelectorAll('[data-home-filter]').forEach(button=>button.addEventListener('click'"));
});
