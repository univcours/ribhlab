import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../', import.meta.url);
const get=(path)=>readFileSync(new URL(path,base),'utf8');
const version=Object.fromEntries(get('rivoscan-version.properties').split(/\r?\n/).filter(s=>/^\s*(versionCode|versionName)=/.test(s)).map(s=>s.trim().split('=')));
test('Android Studio, npm and build metadata agree on one monotonically increasing version',()=>{
 const manifest=JSON.parse(get('package.json'));
 assert.ok(Number.isInteger(Number(version.versionCode)) && Number(version.versionCode)>=26);
 assert.equal(manifest.version,version.versionName);
 assert.ok(get('rivoscan-version.gradle').includes("file('../../rivoscan-version.properties')"));
 assert.ok(get('rivoscan-version.gradle').includes('versionCode rivoCode'));
 assert.ok(get('rivoscan-version.gradle').includes('versionName rivoNameText'));
});
test('Capacitor native integration always pins generated Gradle after the template defaults',()=>{
 const branding=get('apply-rivoscan-branding.ps1');
 const install=get('install-live-scanner.ps1');
 assert.ok(install.includes("apply-rivoscan-branding.ps1"));
 assert.ok(branding.includes("apply from: file('../../rivoscan-version.gradle')"));
 assert.ok(branding.includes('$versionSpec=Join-Path $root'));
 assert.ok(branding.includes('$settings=$settings.TrimEnd()'));
 assert.ok(get('scripts/after-capacitor-sync.mjs').includes('install-live-scanner.ps1'));
});
test('Safe install never attempts -d, pm clear, uninstall or silent app deletion',()=>{
 const installer=get('install-rivoscan-android.ps1');
 assert.ok(installer.includes('if($installed.VersionCode -gt $apkVersionCode)'));
 assert.ok(installer.includes('install -r $apk'));
 assert.ok(!/\binstall\s+-r\s+-d\b/.test(installer));
 assert.ok(!/\bshell\s+pm\s+clear\b/.test(installer));
 assert.ok(!/\badb\s+uninstall\b/.test(installer));
});
