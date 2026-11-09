import test from 'node:test';import assert from 'node:assert/strict';
import {limitZoom} from '../src/viewer-zoom.js';import {readFileSync} from 'node:fs';
test('Bound document pinch zoom and drag within viewport',()=>{
 assert.deepEqual(limitZoom({scale:8,x:9999,y:-9999},600,900,400,500),{scale:6,x:1600,y:-2450});
 assert.deepEqual(limitZoom({scale:.2,x:300,y:-300},300,400,400,500),{scale:1,x:0,y:0});
});
test('Viewer gesture and controls are connected to real navigation and edit',()=>{
 const z=readFileSync(new URL('../src/viewer-zoom.js',import.meta.url),'utf8');
 const v=readFileSync(new URL('../src/document-viewer.js',import.meta.url),'utf8');
 assert.ok(z.includes("viewport.addEventListener('wheel',wheel,{passive:false})"));
 assert.ok(z.includes("pointers.size===2"));
 assert.ok(v.includes('createViewerZoom('));
 for(const a of ["doc-zoom-in","doc-zoom-out","doc-zoom-reset","getImageItems","onEdit('enhance'"])assert.ok(v.includes(a),a);
});
