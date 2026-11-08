import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Release notes accurately describe CameraX manual auto edges and separate ML Kit',()=>{
 const s=read('src/whats-new.js');
 assert.ok(s.includes('CameraX Scan now displays a visible guide'));
 assert.ok(s.includes('Google Auto Scan · ML Kit FULL is available as a separate option'));
 assert.ok(s.includes('سكانير CameraX ولى كيبين إطار التوجيه'));
 assert.ok(s.includes('Le scanner CameraX affiche un guide'));
 assert.ok(!s.includes('Google ML Kit FULL) now opens from the main Scan button'));
});
test('Release notes dialog uses turquoise call-to-action',()=>{
 const c=read('src/rivoscan-layout-repairs.css');
 assert.match(c,/\.rivo-release-dialog>button\[data-rivo-dialog-close\]/);
});
