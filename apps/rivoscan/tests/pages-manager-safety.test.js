import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const java=readFileSync(new URL('../native/android/RivoScanPagesManager.java',import.meta.url),'utf8');
test('Page rotation samples source before decode to avoid large bitmap OOM',()=>{
 assert.match(java,/static int rotationSampleSize\(int width,int height\)/);
 assert.match(java,/MAX_EDIT_EDGE=3600/);
 assert.match(java,/MAX_EDIT_PIXELS=12_000_000/);
 assert.match(java,/options\.inSampleSize=sample/);
 assert.match(java,/Bitmap original=decodePageForRotation\(source\)/);
 assert.doesNotMatch(java,/Bitmap original=BitmapFactory\.decodeFile\(source\)/);
});
test('Page operations preserve original/public files and clean up abandoned temporary edits',()=>{
 assert.match(java,/results\.add\(page\.uri\);continue;/);
 assert.match(java,/created\.add\(output\)/);
 assert.match(java,/for\(File f:created\)f\.delete\(\)/);
 assert.match(java,/if\(host\.isFinishing\(\)\|\|host\.isDestroyed\(\)\)\{/);
 assert.doesNotMatch(java,/new File\(Uri\.parse\(page\.uri\)\.getPath\(\)\)\.delete\(\)/);
});
test('Page manager uses RivoScan turquoise instead of unrelated dark-blue palette',()=>{
 assert.match(java,/Color\.rgb\(5,111,114\)/);
 assert.match(java,/Color\.rgb\(7,61,65\)/);
 assert.match(java,/Color\.rgb\(5,119,117\)/);
 assert.doesNotMatch(java,/Color\.rgb\(25,79,150\)/);
});
