import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/id-photo-maker.js',import.meta.url),'utf8');
test('ID Photo preview is the only photo import entry, with one camera rail button',()=>{
 assert.ok(s.includes("previewImport.className='rivo-id-preview-import'"));
 assert.ok(s.includes('workspace.dock.append(previewImport,leftRail,rightRail,input)'));
 assert.ok(s.includes('workspace.empty.hidden=true'));
 assert.doesNotMatch(s,/const importButton=document\.createElement/);
 assert.doesNotMatch(s,/const cameraButton=document\.createElement/);
 assert.ok(s.includes("railButton(leftRail,'photo',takePhotoLabel"));
 assert.doesNotMatch(s,/\['source','photo'\]/);
});
test('movement controls cannot act before a photo is available',()=>{
 assert.match(s,/const moveButtons=\[\]/);
 assert.match(s,/for\(const b of moveButtons\)b\.disabled=!image/);
 assert.match(s,/if\(!image\)return;/);
 assert.match(s,/for\(const b of moveButtons\)b\.disabled=false/);
});
test('ID Photo uses genuine native camera and keeps original 300 DPI saved format',()=>{
 assert.match(s,/Camera\.getPhoto\(/);
 assert.match(s,/source:CameraSource\.Camera/);
 assert.match(s,/setPNGResolution\(/);
 assert.match(s,/layoutIDPhotoSheet\(select.value\)/);
});
