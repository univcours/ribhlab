import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/id-photo-maker.js',import.meta.url),'utf8');
test('ID Photo does not open a redundant blank Photo settings pane',()=>{
 assert.doesNotMatch(source,/\{id:'source',label:[^\n]*nodes:\[\]\}/);
 assert.match(source,/defaultSection:'adjust'/);
 assert.match(source,/workspace\.show\(false\)/);
 assert.match(source,/workspace\.dock\.append\(previewImport,leftRail,rightRail,input\)/);
 assert.match(source,/Camera\.getPhoto\(/);
});
