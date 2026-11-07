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
test('One file actions are inline horizontal buttons, multi file actions compact',()=>{
 const b=read('src/library-bulk.js'),css=read('src/premium-home.css');
 assert.ok(b.includes("if(!mode||selected.size<2)return '';"));
 assert.ok(b.includes("selected.size===1&&doc&&chosen(doc)"));
 for(const k of ['data-doc-share','data-doc-savepdf','data-doc-preview','data-doc-delete'])assert.ok(b.includes(k));
 assert.ok(b.includes('<small>PDF</small>'));
 assert.ok(css.includes('width:84px!important'));
 assert.ok(css.includes('height:32px!important'));
 assert.ok(css.includes('grid-auto-rows:34px!important'));
 assert.ok(css.includes('body.rivo-multiselect #app .rivo-dark-ui .mobilebar'));
 assert.ok(css.includes('body.rivo-multiselect #app .rivo-dark-ui .floating-scan.rivo-camera-fab'));
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
