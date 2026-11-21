import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('latest CSS imports restore visible labels without changing app behavior',()=>{
 const main=read('src/main.js'),css=read('src/rivo-nav-readability.css');
 assert.ok(main.indexOf("import './rivo-nav-readability.css';")>main.indexOf("import './rivo-controls-clarity.css';"));
 for(const label of ['mobilebar.rivo-nav-five','button:not(.active):not(:disabled)','button.active:not(:disabled)','.rivo-nav-scan-label','.rivo-top-locale select','.rivo-top-sound']){
  assert.ok(css.includes(label),label);
 }
 assert.match(css,/#D6E9FF/i);
 assert.match(css,/#F3FAFF/i);
 assert.doesNotMatch(css,/pointer-events\s*:\s*none/);
 assert.doesNotMatch(css,/display\s*:\s*none/);
 assert.doesNotMatch(css,/transform\s*:\s*scale\(/);
});
