import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Android Studio debug build auto-detects installed version while Play release remains canonical',()=>{
 const g=get('rivoscan-version.gradle');
 assert.ok(g.includes("contains('release')"));
 assert.ok(g.includes('rivoscan-device-version.properties'));
 assert.ok(g.includes("new ProcessBuilder(adb.absolutePath, 'devices')"));
 assert.ok(g.includes("'dumpsys', 'package', 'com.ribhlab.rivoscan'"));
 assert.ok(g.includes('installed + 1L'));
 assert.ok(g.includes('versionCode effectiveCode'));
});
test('Safe installer checks phone before build and never clears data',()=>{
 const s=get('install-rivoscan-android.ps1');
 const p=get('sync-rivoscan-device-version.ps1');
 assert.ok(s.indexOf("Join-Path $root 'sync-rivoscan-device-version.ps1'") < s.indexOf('repair-rivoscan-android.ps1'));
 assert.ok(s.includes('if($apkVersionCode -lt $minDebugCode'));
 assert.ok(s.includes('if($installed.VersionCode -ge $apkVersionCode)'));
 assert.ok(s.includes('install -r $apk'));
 assert.ok(p.includes('$installed+1'));
 assert.ok(p.includes('Android device ${serial}: installed code'));
 assert.ok(!/\$serial:/.test(p), 'Avoid PowerShell variable parse errors before colon');
 assert.ok(p.includes('pm path com.ribhlab.rivoscan'));
 assert.ok(p.includes("'versionCode={0}' -f $new"));
 assert.ok(p.includes('$saved.Count -ne 2'));
 assert.ok(!p.includes("'versionCode='+$new"));
 assert.ok(get('.gitignore').includes('rivoscan-device-version.properties'));
 const executable=[s,p].join('\n').split('\n').filter(l=>!l.trim().startsWith('#')).join(' ');
 assert.ok(!/adb\s+uninstall|pm\s+clear|install\s+-r\s+-d/.test(executable));
});
