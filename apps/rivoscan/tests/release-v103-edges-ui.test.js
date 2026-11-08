import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('RivoScan visual+edge repair ships as a distinct Play release, not old v0.44.26',()=>{
 const version=read('rivoscan-version.properties');
 assert.match(version,/^versionCode=103$/m);
 assert.match(version,/^versionName=0\.44\.27$/m);
 assert.equal(JSON.parse(read('package.json')).version,'0.44.27');
 assert.ok(read('src/main.js').includes("import './rivoscan-layout-repairs.css'"));
 assert.ok(read('native/android/RivoLiveScannerActivity.java').includes('getCornerRevision()!=cornerRevision'));
});
