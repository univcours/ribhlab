import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Book Scan empty preview is compact and full width safe-area PDF button stays visible',()=>{
 const src=read('src/book-split.js'),css=read('src/rivo-book-mobile.css'),main=read('src/main.js');
 assert.match(src,/rivo-book-empty-dock/);
 assert.match(src,/previewDock.classList.remove\('rivo-book-empty-dock'\)/);
 assert.match(css,/rivo-book-empty-dock/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/max-height:210px!important/);
 assert.match(css,/rivo-workspace-task:disabled/);
 assert.ok(main.includes("import './rivo-book-mobile.css'"));
 assert.match(src,/PDFDocument\.create\(\)/);
 assert.match(src,/previousSpreads\.pop\(\)/);
 assert.match(src,/cleanPage\(\)/);
 assert.match(src,/splitBookRegions\(src\.naturalWidth/);
});
test('Book Scan all seven locales have captions and errors and save is disabled while writing',()=>{
 const src=read('src/book-split.js');
 for(const lang of ['en','ar','fr','es','de','pt','it']) {
  assert.ok(src.includes('\n '+lang+':{title:'),lang+' Book UI locale missing');
  assert.ok(src.includes('\n '+lang+':['),lang+' Book actions locale missing');
 }
 assert.match(src,/status.textContent=UI.invalid/);
 assert.match(src,/status.textContent=UI.clean/);
 assert.match(src,/status.textContent=UI.saving/);
 assert.match(src,/saveButton.disabled=true/);
 assert.match(src,/finally\{busy=false;if\(!closed\)saveButton.disabled=!image\}/);
});
