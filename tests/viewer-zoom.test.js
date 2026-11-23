import test from 'node:test';import assert from 'node:assert/strict';
import {limitZoom} from '../src/viewer-zoom.js';import {readFileSync} from 'node:fs';
test('Bound document pinch zoom and drag within viewport',()=>{
 assert.deepEqual(limitZoom({scale:8,x:9999,y:-9999},600,900,400,500),{scale:6,x:1600,y:-2450});
 assert.deepEqual(limitZoom({scale:.2,x:300,y:-300},300,400,400,500),{scale:1,x:0,y:0});
});
test('saved-file zoom overlay was removed; file opens with external Android viewer',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.ok(!main.includes('createDocumentViewer'));
  assert.ok(main.includes('openSavedDocumentExternally'));
  assert.ok(main.includes('RivoDocuments.openFile({uri:doc.uri})'));
});
