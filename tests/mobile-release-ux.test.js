import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hubLabel,hubLanguages} from '../src/tools-hub.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/rivo-release-ux.css',import.meta.url),'utf8');
const audit=readFileSync(new URL('../scripts/visual-ui-audit.mjs',import.meta.url),'utf8');

test('final responsive color layer is imported after earlier competing themes',()=>{
 const lastTheme=main.lastIndexOf("import './rivo-release-ux.css'");
 const older=main.lastIndexOf("import './rivo-accessibility-ads.css'");
 assert.ok(lastTheme>older,'final accessibility overrides must load last');
 for(const color of ['#082752','#0e61c2','#00d8ff','#f5faff','#b8d9f2'])
  assert.ok(css.includes(color),'missing approved color '+color);
});

test('new compact override keeps a four-action row visible at 320px without clipping labels',()=>{
 const compact=readFileSync(new URL('../src/rivo-orbit-compact.css',import.meta.url),'utf8');
 assert.ok(main.includes("import './rivo-orbit-compact.css';"));
 assert.ok(compact.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important'));
 assert.ok(compact.includes('height:66px!important;min-height:66px!important'));
 assert.ok(compact.includes('font-size:11px!important'));
 assert.match(audit,/all Home shortcuts readable and completely visible/);
 assert.match(audit,/scrollHeight<=x\.clientHeight\+2/);
});

test('empty library has a working scan CTA, with localised copy and delegated handling',()=>{
 assert.match(main,/data-empty-scan/);
 for(const snippet of ['Scan your first document','Scanner votre premier document','صور أول وثيقة'])
  assert.ok(main.includes(snippet),'missing first-run translation '+snippet);
 assert.match(main,/home-recents'\)\?\.addEventListener\('click'/);
 assert.match(main,/if\(!action\)return;[\s\S]*?void openSmartScanner\(\)/);
});

test('Tools search gives useful translated empty-result feedback, not a bare zero',()=>{
 assert.match(main,/No matching tools/);
 assert.match(main,/Aucun outil correspondant/);
 assert.match(main,/ما لقيت حتى أداة بهاد الاسم/);
 assert.ok(!main.includes('id="tools-no-results" hidden>0<'));
});

test('all supported languages retain meaningful concise tool names',()=>{
 for(const lang of hubLanguages()){
  for(const id of ['perfectScanQuality','scanCode','bookScan','formulaOcr','photoTranslation','idPhotoMaker']){
   const value=hubLabel(lang,id,'');
   assert.ok(value&&value.length<=40,lang+': '+id+' should remain readable');
  }
 }
});

test('modal actions stay at least 44px high and keep focus visible',()=>{
 assert.match(css,/min-height:46px!important;font-size:14px!important/);
 assert.match(css,/focus-visible/);
 assert.match(css,/font-size:16px!important;min-height:44px!important/);
});
