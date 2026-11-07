import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Local editor reveals real processed image under turquoise scanline for default and chosen filters',()=>{
 const editor=read('src/scan-editor.js'),css=read('src/filter-laser.css');
 assert.ok(editor.includes("import './filter-laser.css'"));
 assert.ok(editor.includes('id="rivo-editor-laser-before"'));
 assert.ok(editor.includes('class="rivo-editor-laser-beam"'));
 assert.ok(editor.includes('function captureBefore()'));
 assert.ok(editor.includes('function startLaser()'));
 assert.ok(editor.includes('await paint(true);'));
 assert.ok(editor.includes("if(preset){filter=preset.dataset.filter;"));
 assert.ok(editor.includes("await paint(true);return;}"));
 assert.ok(editor.includes("laserBefore.style.clipPath='inset(0 0 '"));
 assert.ok(css.includes('box-shadow:0 0 4px 2px'));
});
test('Laser does not change the exported scan or block original, compare or closing',()=>{
 const src=read('src/scan-editor.js');
 assert.ok(src.includes("filter!=='original'"));
 assert.ok(src.includes('stopLaser();shell.remove()'));
 assert.ok(src.includes('compare=true;stopLaser();drawOriginal()'));
 assert.ok(src.includes("preview.toBlob("));
 assert.ok(src.includes('cancelAnimationFrame(laserFrame)'));
 assert.ok(src.includes("prefers-reduced-motion: reduce"));
});
