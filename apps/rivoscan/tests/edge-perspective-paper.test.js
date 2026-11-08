import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Light-paper detector preserves a valid perspective quad rather than axis-aligned only',()=>{
 const s=source('native/android/RivoEdgeDetector.java');
 assert.match(s,/paperPerspectiveCorners\(candidate,w,h\)/);
 assert.match(s,/Imgproc\.approxPolyDP\(curve,approx,perimeter\*tolerance,true\)/);
 assert.match(s,/Imgproc\.isContourConvex\(polygon\)/);
 assert.match(s,/perspective!=null\?perspective/);
});
test('Zoom controls retain room inside the actual PDF preview',()=>{
 const s=source('src/rivoscan-layout-repairs.css');
 assert.ok(s.includes('body .doc-detail-paper{flex:1 1 auto!important;min-height:0!important;height:auto!important'));
});
