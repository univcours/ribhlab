import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Single-file actions stay in one row and multiple selection lives in a compact toolbar',()=>{
 const b=read('src/library-bulk.js'),m=read('src/main.js'),css=read('src/compact-turquoise.css');
 const bar=b.slice(b.indexOf('function toolbar()'),b.indexOf('const isImage='));
 for(const name of ['share','delete','merge','organize','rename','cancel'])
  assert.ok(bar.includes('data-bulk="'+name+'"'),name);
 assert.ok(bar.includes('rivo-inline-bulk'));
 assert.ok(m.includes('bulkUI.count()===1'));
 assert.ok(m.includes('rivo-file-quick-actions'));
 assert.ok(m.includes('data-doc-delete='));
 assert.ok(css.includes('flex-wrap:nowrap'));
 assert.ok(b.includes("window.confirm(t('confirm')"));
});

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
