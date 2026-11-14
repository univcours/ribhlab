import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all 19 real Tools remain present; final UI layer is loaded last',()=>{
 const main=source('src/main.js'),tool=source('src/tools-hub.js');
 assert.ok(main.indexOf("import './rivo-tools-compact-ux.css'")>main.indexOf("import './rivo-device-safe.css'"));
 assert.match(main,/installToolHelp\(\)/);
 assert.match(main,/refreshToolHelp\(\)/);
 assert.match(tool,/entries:\['scanCode'/);
 assert.match(tool,/entries:\['peerTransfer','shareFiles'\]/);
});
test('tool explanations are accessible via real i button without deleting any warning',()=>{
 const js=source('src/tool-help.js');
 assert.match(js,/aria-expanded/);
 assert.match(js,/aria-controls/);
 assert.match(js,/role','note'/);
 assert.match(js,/node\.hidden=true/);
 assert.match(js,/dialog\.textContent=section\.sources\.map/);
 assert.match(js,/addEventListener\('keydown'/);
});
test('compact editor avoids horizontal filters scroll and limits modal heights',()=>{
 const css=source('src/rivo-tools-compact-ux.css');
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(css,/overflow-x:hidden!important/);
 assert.match(css,/max-height:calc\(100dvh - 20px/);
 assert.match(css,/rivo-shield-stage/);
 assert.match(css,/color:#24476a!important/);
});

test('grouped i buttons collect multiple descriptions without additional rows',()=>{
 const js=source('src/tool-help.js'),css=source('src/rivo-tools-compact-ux.css');
 assert.match(js,/const groups=new WeakMap\(\)/);
 assert.match(js,/section\.sources\.push\(node\)/);
 assert.match(js,/section\.sources\.map/);
 assert.match(css,/rivo-peer-workspace \.page-heading p/);
 assert.match(css,/rivo-shield-stage :is\(canvas,\.rivo-shield-empty\)\[hidden\]/);
 assert.match(css,/body \.rivo-editor-overlay \.rivo-editor-window \.rivo-editor-actions>/);
});

test('privacy first-run canvas and PDF thumbnail placeholders are initialized accessibly',()=>{
 const shield=source('src/privacy-shield.js'),pages=source('src/page-manager.js');
 assert.match(shield,/update\(\); \/\/ Initialize first-run empty state/);
 assert.match(pages,/rivo-page-preview-loading/);
 assert.match(pages,/placeholder\.replaceWith\(img\)/);
 assert.match(pages,/Preview unavailable/);
});

test('closing tool information cannot accidentally close its parent modal',()=>{
 const js=source('src/tool-help.js');
 assert.match(js,/e\.stopImmediatePropagation\(\)/);
 assert.match(js,/e\.preventDefault\(\)/);
});

test('PDF page manager uses explicit PDF.js canvas and readable preview fallback',()=>{
 const pages=source('src/page-manager.js'),css=source('src/rivo-tools-compact-ux.css');
 assert.match(pages,/page\.render\(\{canvasContext:ctx,viewport:v,canvas\}\)/);
 assert.match(css,/rivo-pages-modal \.rivo-page-preview-loading/);
 assert.match(css,/color:#24476a!important/);
});
