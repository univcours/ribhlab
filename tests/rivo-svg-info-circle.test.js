import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('real SVG 1:1 circle is used in all tool modals, not a stretched Unicode glyph',()=>{
 const js=read('src/tool-help.js');
 assert.match(js,/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
 assert.match(js,/preserveAspectRatio','xMidYMid meet'/);
 assert.match(js,/cx:'18',cy:'18',r:'15\.5'/);
 assert.match(js,/button\.replaceChildren\(svg\)/);
 assert.match(js,/button\.dataset\.rivoTrueCircle='yes'/);
 assert.match(js,/button\.style\.setProperty\(property,'36px','important'\)/);
 assert.match(js,/aria-controls/);
 assert.match(js,/aria-expanded/);
});
test('final CSS sets actual square button and a separate square SVG paint surface',()=>{
 const main=read('src/main.js');
 const css=read('src/rivo-info-perfect-circle.css');
 assert.ok(main.indexOf("import './rivo-info-perfect-circle.css'")>main.indexOf("import './rivo-native-banner-layout.css'"));
 assert.match(css,/width:36px!important;height:36px!important/);
 assert.match(css,/width:32px!important;height:32px!important/);
 assert.match(css,/aspect-ratio:1 \/ 1!important/);
 assert.match(css,/border-radius:50%!important/);
 assert.match(css,/\.rivo-help-circle-svg/);
 assert.match(css,/flex:0 0 36px!important/);
});
test('visual screenshot QA checks all visible info circles and collects failures',()=>{
 const audit=read('scripts/capture-tools-windows.mjs');
 assert.match(audit,/const helpGeometry=helpButtons\.map/);
 assert.match(audit,/!b\.square\|\|!b\.vectorCircle\|\|!b\.hitTarget/);
 assert.match(audit,/process\.exitCode=1/);
});
