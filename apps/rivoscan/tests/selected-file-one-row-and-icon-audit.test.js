import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Five bound selected-file actions fit a right-aligned icon row',()=>{const css=read('../src/selection-compact.css'),bulk=read('../src/library-bulk.js');for(const k of ['rivo-single-tools','flex-direction:row!important','flex-wrap:nowrap!important','justify-content:flex-end!important','height:38px!important'])assert.ok(css.includes(k),k);for(const k of ['share','preview','delete']){assert.ok(bulk.includes('data-doc-'+k+'='),k);assert.ok(bulk.includes("fileIcon('"+k+"')"),k);}assert.ok(bulk.includes('data-doc-add='));assert.ok(bulk.includes('rivo-add-plus'));assert.ok(bulk.includes('data-doc-edit-rename='));assert.ok(bulk.includes("fileIcon('edit')"));assert.match(bulk,/selected\.size===1/);});

test('all major tool cards and home cards render icons',()=>{
 const main=read('../src/main.js');
 const home=read('../src/premium-home-model.js');
 const scan=read('../src/scanner-first-model.js');
 const tools=read('../src/tools-hub.js');
 assert.match(main,/rivo-hub-tile[^\n]*|rivo-hub-tile/);
 assert.match(main,/tool-icon \$\{color\}">\$\{ico\(icon,26\)\}/);
 assert.match(main,/rivo-scan-mode-icon">\$\{ico\(item\.icon,25\)\}/);
 assert.match(main,/rivo-premium-tile-icon">\$\{ico\(item\.icon,28\)\}/);
 const names=[...main.matchAll(/^\s*(['"]?)([a-z][\w-]*)\1\s*:\s*['"]</gm)].map(m=>m[2]);
 for(const source of [home,scan,tools]){
  const declared=[...source.matchAll(/\bicon\s*:\s*['"]([\w-]+)['"]/g)].map(m=>m[1]);
  for(const name of declared)assert.ok(names.includes(name),'missing SVG definition for '+name);
 }
 for(const name of ['layers','globe','volume','printer','up','down','close'])
  assert.ok(names.includes(name),'missing icon '+name);
});
test('global audio mute and native laser effect remain present',()=>{
 const main=read('../src/main.js'),native=read('../native/android/RivoLiveScannerActivity.java');
 const sound=read('../native/android/RivoSounds.java');
 assert.match(main,/id="header-sound-toggle"/);
 assert.match(main,/id="header-language"/);
 assert.match(native,/enhancementLaser\.reveal\(pendingWarp\)/);
 assert.match(native,/RivoSounds\.play\(this,"scan"\)/);
 assert.match(sound,/if\(!enabled\)stopScannerSound\(\)/);
});
