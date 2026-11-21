import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('ID Photo uses FINAL CSS after shared fullscreen editor rules',()=>{
 const main=load('src/main.js'),css=load('src/rivo-id-photo-layout-04558.css');
 const finalImport="import './rivo-id-photo-layout-04558.css';";
 assert.ok(main.includes(finalImport));
 assert.ok(main.indexOf(finalImport)>main.indexOf("import './rivo-blue-editor-layout.css';"));
 assert.ok(main.indexOf(finalImport)>main.indexOf("import './rivo-nav-readability.css';"));
 assert.match(css,/rivo-id-photo-dialog\.rivo-shared-preview-dialog:not\(\.rivo-id-photo-ready\)/);
 assert.match(css,/flex:0 0 clamp\(125px,20dvh,184px\)!important/);
 assert.match(css,/height:auto!important/);
 assert.match(css,/rivo-workspace-settings\[hidden\]/);
 assert.match(css,/display:none!important/);
});
test('ID Photo grows to a real editing preview only after loading the selected image',()=>{
 const js=load('src/id-photo-maker.js'),css=load('src/rivo-id-photo-layout-04558.css');
 assert.match(js,/image=next;cutout=null;fileName\.textContent=file\.name;\s*panel\.classList\.add\('rivo-id-photo-ready'\)/);
 assert.match(js,/workspace\?\.loaded\(\)/);
 assert.match(js,/workspace\?\.show\(true\)/);
 assert.match(js,/saveButton\.disabled=false/);
 assert.match(css,/rivo-id-photo-dialog\.rivo-shared-preview-dialog\.rivo-id-photo-ready/);
 assert.match(css,/rivo-workspace-has-image/);
 assert.match(css,/flex:1 1 auto!important/);
 assert.match(css,/max-height:38dvh!important/);
 assert.match(js,/setPNGResolution\(new Uint8Array/);
});
test('ID Photo picker, tabs, disabled Save and close buttons remain functional',()=>{
 const js=load('src/id-photo-maker.js'),css=load('src/rivo-id-photo-layout-04558.css');
 assert.match(js,/pickButton\.addEventListener\('click',\(\)=>input\.click\(\)\)/);
 assert.match(js,/saveButton=saveControl;saveButton\.disabled=true/);
 assert.match(js,/mountDialogControls\(\{overlay,panel,close,language\}\)/);
 assert.match(css,/rivo-id-photo-dialog\s+\.rivo-workspace-taskbar/);
 assert.match(css,/rivo-id-import-button/);
 assert.match(css,/rivo-workspace-bottom button:disabled/);
});
