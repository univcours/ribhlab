import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('ID Photo maker keeps full functionality with compact empty state and localized import',()=>{
 const js=read('src/id-photo-maker.js'),css=read('src/rivo-id-photo-mobile.css');
 const app=read('src/main.js'),workspace=read('src/preview-workspace.js');
 assert.match(js,/rivo-id-dialog rivo-id-photo-dialog/);
 assert.match(js,/pickButton\.addEventListener\('click',\(\)=>input\.click\(\)\)/);
 assert.match(js,/UI\.import/);
 assert.match(js,/workspace\?\.choose\('adjust'\)/);
 assert.match(js,/fileName\.textContent=file\.name/);
 assert.match(js,/setPNGResolution\(new Uint8Array/);
 assert.match(js,/await segmentPortrait\(image/);
 assert.match(css,/rivo-shared-preview-dock:not\(\.rivo-workspace-has-image\)/);
 assert.match(css,/height:clamp\(132px,21dvh,220px\)!important/);
 assert.match(css,/rivo-id-native-file/);
 assert.ok(app.includes("import './rivo-id-photo-mobile.css'"));
 for(const lang of ['en','ar','fr','es','de','pt','it']){
  assert.ok(js.includes('\n '+lang+':{import:'),lang+' import translation');
  assert.ok(workspace.includes('\n '+lang+':{settings:'),lang+' preview translation');
 }
});
