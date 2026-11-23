import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Home card icons are crisp and file list types readable',()=>{
 const css=get('src/rivo-ui-04567.css');
 postcss.parse(css);
 for(const check of ['rivo-feature-icon svg','stroke-width:2.6!important',
  'rivo-file-kind-badge','rivo-file-type-icon svg','width:51px!important']){
  assert.ok(css.includes(check),'missing visual rule: '+check);
 }
 const main=get('src/main.js');
 assert.match(main,/if\(typeBadge\)el\.append\(typeBadge\)/);
 assert.match(main,/data-thumb-uri/);
 assert.match(main,/function renderSavedFileRow\(item,index\)/);
});
test('Translation and Math get separate identifiable symbols, not generic T',()=>{
 const main=get('src/main.js'),tools=get('src/tools-hub.js');
 assert.match(main,/const ico = \(name,size=20\) => phosphorIcon\(name,size\)/);
 assert.match(get('src/material-symbols.js'),/"translate": "translate"/);
 assert.match(get('src/material-symbols.js'),/"math": "functions"/);
 assert.ok(tools.includes("photoTranslation:{icon:'translate'"));
 assert.ok(tools.includes("formulaOcr:{icon:'math'"));
});
