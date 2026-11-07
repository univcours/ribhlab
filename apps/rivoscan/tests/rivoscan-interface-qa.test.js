import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Home has no giant ad promotion or standalone ADS header',()=>{
 const main=read('src/main.js'),home=main.slice(main.indexOf('function home(){'),main.indexOf('function toolsWorkspace(){'));
 assert.ok(!main.includes('data-ad-entry'));
 assert.ok(!home.includes('rivo-ai-compact'));
 assert.ok(home.includes('rivo-scan-more-tools'));
 assert.ok(!home.includes('>ADS<'));
 assert.ok(!home.includes('rivo-premium-lock'));
 assert.ok(!main.includes('rivo-hub-ad'));
});
test('Selected one file actions are six icon-only buttons, multi actions are horizontal',()=>{
 const bulk=read('src/library-bulk.js'),css=read('src/premium-home.css'),m=read('src/main.js');
 assert.ok(bulk.includes("selected.size===1&&doc&&chosen(doc)"));
 for(const k of ['data-doc-share','data-doc-edit','data-doc-preview','data-doc-rename','data-doc-delete','data-doc-add'])
  assert.ok(bulk.includes(k),k);
 for(const k of ["data-doc-edit","data-doc-rename","data-doc-add"])
  assert.ok(m.includes(k),k);
 assert.ok(css.includes('grid-template-columns:none!important'));
 assert.ok(css.includes('justify-content:flex-end!important'));
 assert.ok(css.includes('bottom:calc(172px + env(safe-area-inset-bottom,0px))!important'));
});
test('Android back gestures close editors first, Retake is visible',()=>{
 const main=read('src/main.js'),editor=read('src/scan-editor.js');
 for(const k of ['.rivo-editor-overlay [data-edit="cancel"]','.rivo-perfectscan-modal [data-perfect="close"]',
 '.rivo-id-overlay .rivo-code-actions button:last-child','nativeCaptureDepth>0)return true',
 "CapacitorApp.addListener('backButton'", "document.addEventListener('touchend'"])
 assert.ok(main.includes(k),k);
 assert.ok(editor.includes('data-edit="retake"'));
 assert.ok(!editor.includes('Paper Scan Pro'));
});
