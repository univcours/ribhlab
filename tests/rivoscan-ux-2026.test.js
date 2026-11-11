import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialLanguage,deviceLanguage} from '../src/locale-auto.js';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('phone locale is used first launch and persisted manual choice wins',()=>{
 assert.equal(deviceLanguage(['ar-MA','fr-FR']),'ar');
 assert.equal(deviceLanguage(['fr-CA']),'fr');
 assert.equal(deviceLanguage(['zh-CN','de-DE']),'de');
 assert.equal(initialLanguage('en',['ar-MA']),'en');
 assert.equal(initialLanguage(null,['ar-MA']),'ar');
 assert.equal(initialLanguage('xx',['pt-BR']),'pt');
});
test('language and mute toggle always visible in the top bar',()=>{
 const main=src('src/main.js');
 assert.ok(main.includes('id="header-language"'));
 assert.ok(main.includes('id="header-sound-toggle"'));
 assert.ok(main.includes("document.querySelectorAll('#language,#header-language')"));
 assert.ok(main.includes('localStorage.setItem(\'rivo-language\',language)'));
 assert.ok(main.includes('initialLanguage(localStorage.getItem'));
});
test('every PDF has a visible checkbox and optional Select all above documents',()=>{
 const bulk=src('src/library-bulk.js'), main=src('src/main.js'),css=src('src/rivo-design-system.css');
 assert.ok(bulk.includes('Every saved document and image has a persistent selection checkbox'));
 assert.ok(!bulk.includes('if(!mode&&!isImage(doc))return'));
 assert.ok(!bulk.includes("else if(!mode&&existing&&!alwaysVisible"));
 assert.ok(bulk.includes('function selectBanner(){'));
 assert.ok(bulk.includes('if(!selected.size)return'));
 assert.ok(main.includes('id="library-select-banner"'));
 assert.ok(main.includes('id="home-select-banner"'));
 assert.ok(css.includes('visibility:visible!important'));
 assert.ok(css.includes('rivo-top-controls'));
});
test('no duplicate RivoScan home heading and real QR icon in both places',()=>{
 const main=src('src/main.js'),tools=src('src/tools-hub.js');
 assert.ok(main.includes('rivo-home-trust'));
 assert.ok(!main.includes('<span class="rivo-home-heading"><strong>RivoScan</strong>'));
 assert.ok(main.includes("{id:'scanCode',icon:'qr'"));
 assert.ok(tools.includes("scanCode:{icon:'qr'"));
});
