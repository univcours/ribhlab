import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/rivo-responsive-04573.css');
const source=read('src/main.js');

test('The automatic-language option spells AUTO completely in the header',()=>{
 assert.match(source,/<select id="header-language"[^>]*><option value="auto"[^>]*>AUTO<\/option>/);
 assert.match(css,/\.rivo-top-locale select#header-language/);
 assert.match(css,/min-width:69px!important/);
 assert.match(css,/appearance:none!important/);
 assert.match(css,/\.rivo-top-locale::after/);
});
test('Responsive stylesheet runs last so legacy 42px selector cannot crop AUTO',()=>{
 assert.ok(source.lastIndexOf("import './rivo-responsive-04573.css';") > source.lastIndexOf("import './rivo-layout-04573.css';"));
 assert.match(css,/\.rivo-top-locale\{/);
 assert.match(css,/min-width:109px!important/);
 assert.match(css,/@media\(max-width:359px\)/);
});
test('Narrow Home cards receive two real rows instead of overlap',()=>{
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-template-rows:repeat\(2,110px\)!important/);
 assert.match(css,/height:240px!important/);
 assert.match(css,/\.rivo-home-search-title-row\{/);
 assert.match(css,/margin:0 0 12px!important/);
});
test('Home and Tools content are independently scrollable above native banner',()=>{
 assert.match(css,/\.content:has\(>\.rivo-compact-home\)/);
 assert.match(css,/\.content>\.rivo-compact-home\{/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/\.content>\.rivo-tools-hub>\.rivo-tools-scroll\{/);
 assert.match(css,/scroll-padding-bottom:46px!important/);
 assert.match(css,/bottom:var\(--rivo-content-bottom,98px\)!important/);
});
test('Camera/results layout is responsive, with Plate stacked and QR side by side',()=>{
 assert.match(css,/\.rivo-plate-overlay\.rivo-live-overlay \.rivo-live-split-stage\{/);
 assert.match(css,/grid-template-rows:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.rivo-code-overlay\.rivo-live-overlay \.rivo-live-split-stage\{/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});
