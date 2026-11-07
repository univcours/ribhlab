import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Turquoise redesign is imported after legacy style sheets',()=>{
 const main=read('src/main.js');
 assert.ok(main.indexOf("import './turquoise-v2.css'")>main.indexOf("import './premium-home.css'"));
 assert.ok(read('src/turquoise-v2.css').includes('.rivo-v2-home-heading'));
});
test('Camera remains reachable through all four primary Android tabs, especially Me',()=>{
 const main=read('src/main.js');
 const nav=main.slice(main.indexOf('const mobile ='),main.indexOf('function visualFileType('));
 assert.match(nav,/const showFab=\(isHome\|\|isDocs\|\|isTools\|\|isMe\)/);
 assert.match(nav,/data-live-camera/);
 assert.ok(nav.indexOf('data-go="home"')<nav.indexOf('data-tab="tools"'));
 assert.ok(nav.indexOf('data-tab="tools"')<nav.indexOf('data-open-library'));
 assert.ok(nav.indexOf('data-open-library')<nav.indexOf('data-tab="me"'));
});
test('Four pages share turquoise layout but do not pretend cloud accounts exist',()=>{
 const main=read('src/main.js'),css=read('src/turquoise-v2.css');
 for(const cls of ['rivo-v2-stats','rivo-v2-popular','rivo-v2-documents','rivo-v2-profile','rivo-v2-tools-subtitle'])assert.ok(main.includes(cls),cls);
 assert.ok(css.includes('.rivo-v2-documents'));
 assert.ok(css.includes('.rivo-v2-me'));
 for(const fake of ['Emma Carter','emma.carter@rivoscan.com','2.8 GB / 10 GB'])assert.ok(!main.includes(fake));
 assert.ok(main.includes('documentCategoryCounts(libraryItems,visualFileType)'));
 assert.ok(main.includes('data-doc-open')&&main.includes('data-doc-select'));
});
test('No migration, delete, uninstall, or storage schema change in visual styling',()=>{
 const css=read('src/turquoise-v2.css');
 assert.doesNotMatch(css,/adb uninstall|pm clear|localStorage\.clear|indexedDB\.deleteDatabase/);
 assert.ok(read('src/turquoise-v2-model.js').includes("export function turquoiseCopy"));
});
