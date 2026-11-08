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
test('Five compact actions and seven bulk actions stay wired',()=>{const bulk=read('src/library-bulk.js'),css=read('src/selection-compact.css'),m=read('src/main.js');assert.ok(bulk.includes('selected.size===1&&doc&&chosen(doc)'));for(const k of ['data-doc-share','data-doc-edit-rename','data-doc-preview','data-doc-delete','data-doc-add'])assert.ok(bulk.includes(k),k);assert.ok(m.includes('RivoDocuments.editFile({uri:doc.uri})'));for(const k of ['flex-wrap:nowrap!important','justify-content:flex-end!important','rivo-bulk-icon-row'])assert.ok(css.includes(k),k);});

test('Android back gestures close editors first, Retake is visible',()=>{
 const main=read('src/main.js'),editor=read('src/scan-editor.js');
 for(const k of [".rivo-editor-overlay",".rivo-perfectscan-overlay",
 ".rivo-id-overlay",".rivo-code-overlay",".rivo-pages-overlay",
 ".bulk-overlay",".doc-detail-overlay","[data-edit=\"cancel\"]",
 "[data-perfect=\"close\"]","[data-rivo-dialog-close]",
 "nativeCaptureDepth>0","if(bulkUI.mode())",
 "CapacitorApp.addListener('backButton'", "document.addEventListener('touchend'"])
 assert.ok(main.includes(k),k);
 assert.ok(editor.includes('data-edit="retake"'));
 assert.ok(!editor.includes('Paper Scan Pro'));
});
