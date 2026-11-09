import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Android Studio debug cannot replace the Play app',()=>{
 const g=read('rivoscan-version.gradle');
 assert.ok(g.includes("applicationIdSuffix '.debug'"));
 assert.ok(g.includes("manifestPlaceholders['rivoscanAppLabel'] = 'RivoScan DEV'"));
 assert.ok(g.includes("manifestPlaceholders['rivoscanAppLabel'] = 'RivoScan'"));
 assert.ok(g.includes("'dumpsys', 'package', 'com.ribhlab.rivoscan.debug'"));
 const brand=read('apply-rivoscan-branding.ps1');
 assert.ok(brand.includes('rivoscanAppLabel'));
 const installer=read('install-rivoscan-android.ps1');
 assert.ok(installer.includes('if($apkPackage -ne "com.ribhlab.rivoscan.debug")'));
 assert.ok(installer.includes('com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.RivoComposeActivity'));
 assert.ok(!installer.includes('shell pm path com.ribhlab.rivoscan '));
 assert.ok(read('sync-rivoscan-device-version.ps1').includes('pm path com.ribhlab.rivoscan.debug'));
});
test('The correct embedded web assets are required for each Android build type',()=>{
 const pkg=JSON.parse(read('package.json')),g=read('rivoscan-version.gradle');
 const marker=read('scripts/write-build-mode.mjs');
 assert.ok(pkg.scripts.postbuild.includes('scripts/write-build-mode.mjs'));
 assert.ok(marker.includes('rivoscan-build-mode.txt'));
 assert.ok(marker.includes("'production':'debug'"));
 assert.ok(g.includes("'preDebugBuild', 'preReleaseBuild'"));
 assert.ok(g.includes("name == 'preReleaseBuild' ? 'production' : 'debug'"));
 assert.ok(read('prepare-rivoscan-production-android-studio.ps1').includes('rivoscan-build-mode.txt'));
});
test('Emulator and screenshots test DEV, not the real Play app',()=>{
 const emulator=read('scripts/emulator-smoke.sh'),shots=read('scripts/play-store-screenshots.sh');
 for(const script of [emulator,shots]){
  assert.ok(script.includes('com.ribhlab.rivoscan.debug'));
  assert.ok(script.includes('com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.RivoComposeActivity'));
  assert.doesNotMatch(script,/com\.ribhlab\.rivoscan(?!\.debug|\.MainActivity|\.RivoComposeActivity)/);
 }
});
test('Read-only phone inspector distinguishes Production and DEV',()=>{
 const s=read('verify-rivoscan-on-phone.ps1');
 assert.ok(s.includes("Id='com.ribhlab.rivoscan'"));
 assert.ok(s.includes("Id='com.ribhlab.rivoscan.debug'"));
 assert.ok(s.includes('versionCode='));
 assert.doesNotMatch(s,/adb\s+uninstall|pm\s+clear|install\s+-r/);
});
