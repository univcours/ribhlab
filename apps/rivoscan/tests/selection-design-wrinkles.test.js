import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Saved image is selectable, and all group actions preserve delete confirmation',()=>{const b=read('src/library-bulk.js'),m=read('src/main.js');const bar=b.slice(b.indexOf('function toolbar()'),b.indexOf('function checkbox('));for(const k of ['share','organize','merge','delete','all','invert','cancel'])assert.ok(bar.includes('data-bulk="'+k+'"'),k);assert.ok(bar.includes('bulk-actions rivo-bulk-icon-row'));assert.ok(!b.includes("if(!mode&&!isImage(doc))return ''"));assert.ok(b.includes('if(!selected.size)mode=false'));assert.ok(b.includes("window.confirm(t('confirm')"));assert.ok(m.includes('class="doc-select-box rivo-recent-check"'));assert.ok(m.includes('data-doc-delete='));});

test('Comfort UI has sticky photo actions, readable controls and reduced-motion support',()=>{
 const css=read('src/theme-brand.css');
 for(const token of ['RivoScan Comfort UI','.bulk-primary{display:grid;grid-template-columns:1fr 1fr',
 '.bulk-delete-primary','body.rivo-multiselect #home-recents',':focus-visible','prefers-reduced-motion:reduce'])
 assert.ok(css.includes(token),token);
});
test('Image editor offers crease mode and optional official ML Kit FULL photo cleanup',()=>{
 const e=read('src/scan-editor.js'),m=read('src/main.js'),n=read('native/android/RivoDocumentEnhancer.java');
 for(const token of ["preset:'crease'","scannerMode:'FULL'","galleryImportAllowed:true"])
 assert.ok(m.includes(token),token);
 for(const token of ["onDeepClean=null",'data-edit="deepClean"',"action==='deepClean'&&onDeepClean","filter==='crease'"])
 assert.ok(e.includes(token),token);
 for(const token of ['CREASE="crease"','originalRGB.copyTo(rgb,stampMask)','originalRGB.copyTo(rgb,darkMask)'])
 assert.ok(n.includes(token),token);
});
