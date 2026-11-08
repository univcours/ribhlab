import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('six file actions are exactly in one right-side turquoise row, not 3x2',()=>{
 const css=read('../src/turquoise-v2.css');
 const final=css.split('/* RivoScan selected document: exactly ONE')[1];
 assert.ok(final,'final CSS override missing');
 assert.match(final,/grid-column:4!important/);
 assert.match(final,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
 assert.match(final,/grid-template-rows:36px!important/);
 assert.match(final,/grid-auto-flow:column!important/);
 assert.match(final,/background:#e4faf4!important/);
 assert.doesNotMatch(final,/repeat\(2,40px\)/);
 assert.doesNotMatch(final,/repeat\(3,minmax\(0,1fr\)\)/);
 const bulk=read('../src/library-bulk.js');
 for(const action of ['share','edit','preview','rename','delete','add']){
   assert.ok(bulk.includes('data-doc-'+action+'="${index}"'),'missing action '+action);
   assert.ok(bulk.includes("fileIcon('"+action+"')"),'missing icon '+action);
 }
 assert.match(bulk,/selected\.size===1/);
});
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
