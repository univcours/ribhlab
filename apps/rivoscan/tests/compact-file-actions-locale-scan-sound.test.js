import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('selected file: all 6 actions retain handlers and SVG icons',()=>{
 const bulk=read('../src/library-bulk.js');
 for(const action of ['share','edit','preview','rename','delete','add']){
  assert.ok(bulk.includes('data-doc-'+action+'="${index}"'), 'missing action '+action);
  assert.ok(bulk.includes("fileIcon('"+action+"')"), 'missing icon '+action);
 }
 assert.ok(bulk.includes('selected.size===1'));
});
test('selected file actions in 3 columns x 2 short rows on the right',()=>{
 const compact=read('../src/turquoise-v2.css').split('/* Selected file: six small')[1];
 assert.ok(compact);
 assert.match(compact,/grid-column:4!important/);
 assert.match(compact,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(compact,/grid-template-rows:repeat\(2,40px\)!important/);
 assert.match(compact,/height:40px!important/);
 assert.match(compact,/rivo-action-label/);
});
test('top language and all-sound mute are present on every render',()=>{
 const main=read('../src/main.js');
 const css=read('../src/turquoise-v2.css');
 assert.match(main,/id="header-language"/);
 assert.match(main,/id="header-sound-toggle"/);
 assert.match(main,/function setGlobalSound/);
 assert.match(main,/RivoLiveScanner.setSoundSettings/);
 assert.match(main,/RivoLiveScanner.setLanguageSettings/);
 assert.match(css,/rivo-header-language/);
});
test('laser animation is retained with a mute-aware native scanner sound',()=>{
 const web=read('../src/scan-editor.js');
 const java=read('../native/android/RivoLiveScannerActivity.java');
 const sounds=read('../native/android/RivoSounds.java');
 assert.match(web,/rivo-editor-laser-beam/);
 assert.match(web,/onScanSound\?\.\(\)/);
 assert.match(java,/enhancementLaser\.reveal\(pendingWarp\)/);
 assert.match(java,/RivoSounds\.play\(this,"scan"\)/);
 assert.match(sounds,/AudioTrack\.MODE_STATIC/);
 assert.match(sounds,/if\(!enabled\)stopScannerSound\(\)/);
 assert.match(java,/scannerQuickControls\(\)/);
});
