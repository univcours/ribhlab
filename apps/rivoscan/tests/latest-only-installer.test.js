import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('The version is at least 101, coherent, and installer never downgrades',()=>{
 const v=get('rivoscan-version.properties'),pkg=JSON.parse(get('package.json'));
 assert.ok(Number(/^versionCode=(\d+)$/m.exec(v)?.[1])>=101);
 assert.match(v,/^versionName=\d+\.\d+\.\d+$/m);
 assert.equal(pkg.version,/^versionName=(.+)$/m.exec(v)?.[1]);
 const installer=get('install-rivoscan-android.ps1');
 assert.ok(installer.includes('fetch --no-tags origin'));
 assert.ok(installer.includes('Refresh latest RivoScan revision after build'));
 assert.ok(installer.includes('if($latest -ne $localCommit)'));
 assert.ok(installer.includes('if($installed.VersionCode -ge $apkVersionCode)'));
 assert.ok(installer.includes('if($apkVersionCode -lt $minDebugCode'));
 assert.ok(installer.includes('install -r $apk'));
 const commands=installer.split(String.fromCharCode(10)).filter(line=>!line.trimStart().startsWith('#')).join(' ');
 assert.ok(!/\badb\s+uninstall\b|\bpm\s+clear\b|\binstall\s+-r\s+-d\b/.test(commands));
});
test('Debug installs never inherit live-production AdMob settings',()=>{
 const installer=get('install-rivoscan-android.ps1');
 assert.ok(installer.includes("$env:VITE_RIVOSCAN_ADMOB_PRODUCTION='false'"));
 assert.ok(installer.includes("$env:RIVOSCAN_ADMOB_PRODUCTION='false'"));
 assert.ok(installer.includes("Ignoring old/offline RIVOSCAN_DEVICE_SERIAL"));
});
