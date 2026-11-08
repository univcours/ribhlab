import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('selected file keeps five functional icon actions including combined Edit/Rename',()=>{const bulk=read('../src/library-bulk.js'),main=read('../src/main.js');for(const action of ['share','preview','delete','add']){assert.ok(bulk.includes('data-doc-'+action+'='),action);assert.ok(bulk.includes("fileIcon('"+action+"')"),action);}assert.ok(bulk.includes('data-doc-edit-rename='));assert.ok(bulk.includes("fileIcon('edit')"));assert.ok(main.includes("target.hasAttribute('data-doc-edit-rename')"));assert.ok(bulk.includes('selected.size===1'));});

test('selected file actions share one right-aligned compact horizontal row',()=>{const css=read('../src/selection-compact.css');for(const k of ['rivo-single-tools','flex-direction:row!important','flex-wrap:nowrap!important','justify-content:flex-end!important','height:38px!important'])assert.ok(css.includes(k),k);});

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
