import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('The latest version is 0.44.22 / 98 and the safe installer never downgrades',()=>{
 const v=get('rivoscan-version.properties'),pkg=JSON.parse(get('package.json'));
 assert.ok(v.includes('versionCode=98'));
 assert.ok(v.includes('versionName=0.44.22'));
 assert.equal(pkg.version,'0.44.22');
 const installer=get('install-rivoscan-android.ps1');
 assert.ok(installer.includes('fetch --no-tags origin'));
 assert.ok(installer.includes('Refresh latest RivoScan revision after build'));
 assert.ok(installer.includes('if($latest -ne $localCommit)'));
 assert.ok(installer.includes('if($installed.VersionCode -gt $apkVersionCode)'));
 assert.ok(installer.includes('if($apkVersionCode -ne $sourceCode'));
 assert.ok(installer.includes('install -r $apk'));
 assert.ok(!/\badb\s+uninstall\b|\bpm\s+clear\b|\binstall\s+-r\s+-d\b/.test(installer));
});
test('Debug installs never inherit live-production AdMob settings',()=>{
 const installer=get('install-rivoscan-android.ps1');
 assert.ok(installer.includes("$env:VITE_RIVOSCAN_ADMOB_PRODUCTION='false'"));
 assert.ok(installer.includes("$env:RIVOSCAN_ADMOB_PRODUCTION='false'"));
 assert.ok(installer.includes("Ignoring old/offline RIVOSCAN_DEVICE_SERIAL"));
});
