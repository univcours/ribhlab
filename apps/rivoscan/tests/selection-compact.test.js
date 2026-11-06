import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('ADS badges remain on tools, not the app header',()=>{
 const s=read('src/main.js');
 assert.ok(!s.includes('data-ad-entry'));assert.ok(s.includes('rivo-ai-status'));
});
test('single selection shows inline actions without hiding camera or opening full toolbar',()=>{
 const b=read('src/library-bulk.js'),s=read('src/main.js');
 assert.ok(b.includes("if(!mode||selected.size<2)return '';"));
 assert.ok(b.includes("mode&&selected.size===1&&doc&&chosen(doc)"));
 for(const action of ['data-doc-share','data-doc-savepdf','data-doc-preview','data-doc-delete'])
  assert.ok(b.includes(action),action);
 assert.ok(s.includes("target.hasAttribute('data-doc-preview')"));
 assert.ok(b.includes("mode&&selected.size>=2"));
 assert.ok(!b.includes("if(!mode&&!isImage(doc))return ''"));
});
test('bulk toolbar is compact, only 2+ and above Android safe area',()=>{
 const css=read('src/premium-home.css'),b=read('src/library-bulk.js');
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(css.includes('.rivo-selection-inline'));
 assert.ok(css.includes('env(safe-area-inset-bottom,0px)'));
 assert.ok(!b.includes('data-bulk="rename"'));
 assert.ok(b.includes('data-bulk="organize"'));
});

test('Home category buttons navigate to actually filtered Documents',()=>{
 const s=read('src/main.js');
 assert.ok(s.includes("libraryFilter=button.dataset.homeFilter;"));
 assert.ok(s.includes("document.querySelectorAll('[data-home-filter]').forEach(button=>button.addEventListener('click'"));
 assert.ok(s.includes('openLibrary();'));
});
