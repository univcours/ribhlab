import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/rivo-icon-identity-04575.css');
const main=read('src/main.js');

test('approved RivoScan launcher art remains unchanged and contains glossy blue signature',()=>{
 const generator=read('scripts/create-turquoise-icon.mjs');
 assert.match(generator,/symbol-only glossy blue R/);
 assert.match(generator,/const SOURCE_SHA256='7b752cb1cac38681bc47a100a55182214c4e385b2056a43b207134da3067f9c7'/);
 for(const c of ['#061b58','#0E61C2','#00D8FF']){
  assert.ok(css.toLowerCase().includes(c.toLowerCase()),'missing icon palette '+c);
 }
});
test('glossy icon stylesheet precedes the user-requested static override and preserves semantic SVG',()=>{
 const last=main.lastIndexOf("import './rivo-icon-identity-04575.css';");
 assert.ok(last>main.indexOf("import './rivo-visual-04574.css';"));
 assert.ok(main.indexOf("import './rivo-camscanner-static-04576.css';")>last);
 assert.match(css,/Every operation retains its own meaningful SVG/);
 assert.match(css,/file-type thumbnails and actionable scanner controls/);
 assert.match(main,/class="rivo-feature-icon">\$\{ico\(f.icon,21\)\}/);
 assert.match(main,/class="tool-icon \$\{color\}">\$\{ico\(icon,26\)\}/);
});
test('Home, Tools, PDF tools, Settings and bottom navigation share one luminous icon chassis',()=>{
 for(const selector of [
  '.rivo-home .rivo-feature-rail>.rivo-feature-tile>.rivo-feature-icon',
  '.rivo-tools-scroll .rivo-hub-grid>.rivo-hub-tile>.tool-icon',
  '.workspace .work-title>.tool-icon',
  '.settings-row>.settings-row-icon',
  '.mobilebar.rivo-nav-five .rivo-nav-icon',
  '.tool-card .tool-icon'
 ]){
  assert.ok(css.includes(selector),'missing '+selector);
 }
 assert.equal((main.match(/class="rivo-nav-icon"/g)||[]).length,4);
 assert.match(main,/class="rivo-nav-scan-ring">\$\{ico\('scan',27\)\}/);
});
test('rotating cyan halo, glass highlight, pulsing glow, reduced-motion protection',()=>{
 assert.match(css,/@property --rivo-icon-turn/);
 assert.match(css,/@keyframes rivoIconNeonOrbit/);
 assert.match(css,/@keyframes rivoIconNeonBreath/);
 assert.match(css,/conic-gradient\(from var\(--rivo-icon-turn\)/);
 assert.match(css,/animation:rivoIconNeonOrbit 4\.6s linear infinite!important/);
 assert.match(css,/animation:rivoIconNeonBreath 5\.4s ease-in-out infinite!important/);
 assert.match(css,/-webkit-mask-composite:xor!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation:none!important/);
});
test('icon glows never enlarge content cards, and navbar keeps five-slot scan semantics',()=>{
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/max-width:var\(--rivo-icon-size,30px\)!important/);
 assert.match(css,/max-height:var\(--rivo-icon-size,30px\)!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(main,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(css,/--rivo-icon-size:27px/);
});
test('signed release version 0.45.90 with new Android versionCode 205',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.90');
 assert.match(read('rivoscan-version.properties'),/^versionCode=205$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.90$/m);
});
