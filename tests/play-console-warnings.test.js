import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('DEX optimization enabled for actual Play release, with a mapping file check',()=>{
 const p=read('install-live-scanner.ps1'),w=read('.github/workflows/rivoscan-04544-original-key.yml');
 for(const value of ['RIVOSCAN_R8_RELEASE_OPTIMIZATION','minifyEnabled true','shrinkResources true','proguard-android-optimize.txt','RIVOSCAN_KEEP_NATIVE_ENTRY_POINTS'])assert.ok(p.includes(value));
 assert.ok(w.includes('build/outputs/mapping/release/mapping.txt'));
});
test('Android 15 status/navigation and keyboard insets replace deprecated bar-color setters',()=>{
 const p=read('install-live-scanner.ps1'),a=read('native/android/RivoLiveScannerActivity.java'),m=read('src/main.js');
 for(const text of [p,a]){
  assert.doesNotMatch(text,/getWindow\(\)\.setStatusBarColor\(/);
  assert.doesNotMatch(text,/getWindow\(\)\.setNavigationBarColor\(/);
  assert.match(text,/WindowCompat\.setDecorFitsSystemWindows\(getWindow\(\),\s*false\)/);
  assert.match(text,/WindowInsetsCompat\.Type\.systemBars\(\)/);
  assert.match(text,/WindowInsetsCompat\.Type\.displayCutout\(\)/);
  assert.match(text,/WindowInsetsCompat\.Type\.ime\(\)/);
 }
 assert.doesNotMatch(m,/StatusBar\.setBackgroundColor\(/);
 assert.doesNotMatch(m,/StatusBar\.setOverlaysWebView\(/);
});
test('Android 16 removes rotation restrictions and permits large-screen resizing',()=>{
 const p=read('install-live-scanner.ps1');
 assert.match(p,/android:resizeableActivity="true"/);
 assert.doesNotMatch(p,/android:screenOrientation="portrait"/);
 assert.match(p,/\$m=\[regex\]::Replace\(\$m/);
});
