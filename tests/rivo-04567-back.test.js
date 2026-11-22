import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/rivo-ui-04567.css',import.meta.url),'utf8');
test('animated glow covers global navigation and every real tool close/back selector',()=>{
 for(const id of ['data-inapp-back','data-rivo-modal-close','data-scan-overlay-close',
  'data-merged-close','data-edge="close"','data-page-action="close"',
  'data-perfect="close"','data-shield="close"','data-close-sheet']){
  assert.ok(css.includes('['+id+']'),'missing glow on '+id);
 }
 assert.match(css,/@keyframes rivo-04567-back-halo/);
 assert.match(css,/animation:rivo-04567-back-halo 2\.35s ease-in-out infinite!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/focus-visible/);
 assert.match(css,/border:2px solid #56baff!important/);
});
