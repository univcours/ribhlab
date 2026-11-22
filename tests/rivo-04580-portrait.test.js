import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('RivoScan Android launch activity is locked to portrait in full and compact builds',()=>{
 const compact=source('scripts/prepare-rivoscan-compact.py');
 const native=source('install-live-scanner.ps1');
 for(const text of [compact,native]){
  assert.match(text,/android:screenOrientation="portrait"/);
  assert.match(text,/MainActivity/);
 }
 assert.match(compact,/manifest.write_text\(xml,encoding="utf-8"\)/);
 assert.match(native,/\$m=\$m.Replace\(\$oldActivity,\$newActivity\)/);
});
test('Portrait lock is verified after compact Android sync and in the signed APK',()=>{
 const flow=source('.github/workflows/rivoscan-04580-restore-list-keep-thumbnails.yml');
 assert.match(flow,/python3 scripts\/verify-rivoscan-portrait.py/);
 assert.match(flow,/screenOrientation/);
 assert.match(flow,/Verify APK version, signature and installation metadata/);
});
