import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('button polish applies after legacy CSS and preserves functional states',()=>{
 const main=read('src/main.js'),css=read('src/rivo-button-finish.css');
 assert.ok(main.indexOf("import './rivo-button-finish.css';")>main.indexOf("import './rivo-blue-editor-layout.css';"));
 for(const marker of ['.rivo-top-locale','.rivo-top-sound','.rivo-tools-hub .rivo-hub-tile','.rivo-workspace-task','focus-visible','prefers-reduced-motion']){
  assert.ok(css.includes(marker),marker);
 }
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(css,/pointer-events:\s*none/);
 assert.doesNotMatch(css,/display:\s*none/);
});
