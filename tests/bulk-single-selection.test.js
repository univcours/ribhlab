import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scannerDailyFile} from '../src/scan-ledger.js';

const bulk=readFileSync(new URL('../src/library-bulk.js',import.meta.url),'utf8');
const top=readFileSync(new URL('../src/rivo-bulk-top.css',import.meta.url),'utf8');
const visual=readFileSync(new URL('../scripts/visual-ui-audit.mjs',import.meta.url),'utf8');

test('bulk toolbar is reserved for two or more selected documents',()=>{
 assert.match(bulk,/if\(!mode\|\|selected\.size<2\)return ''/);
 assert.match(bulk,/compactAction\('delete',t\('delete'\),'trash'\)/);
 assert.match(bulk,/compactAction\('share',t\('share'\),'share'\)/);
 assert.match(bulk,/compactAction\('organize',t\('move'\),'move'\)/);
 assert.match(bulk,/function selectBanner\(\)\{return '';\}/);
 assert.match(bulk,/rivo-selection-count/);
});
test('selection toolbar is inserted above RecyclerView, never at bottom navbar',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const slot=main.indexOf('id="library-selection-root"');
 const list=main.indexOf('id="library-list"');
 assert.ok(slot>0&&list>slot);
 assert.match(top,/#library-selection-root/);
 assert.match(top,/position:static!important/);
});
test('responsive screenshots show real action icons and truthful demo file count',()=>{
 assert.match(visual,/const paths=\{/);
 assert.match(visual,/stroke="currentColor"/);
 assert.match(visual,/2 TEST FILES/);
 assert.match(visual,/selection-single-test-fixture\.png/);
 assert.doesNotMatch(visual,/M4 4h16v16H4z/);
});
test('QR and barcode journals remain two permanent TXT files',()=>{
 assert.equal(scannerDailyFile('QR','2026-11-15'),'RS_QR.txt');
 assert.equal(scannerDailyFile('CODE128','2026-11-16'),'RS_Bar.txt');
});
