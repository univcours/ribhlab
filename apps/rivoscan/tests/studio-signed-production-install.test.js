import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../install-rivoscan-studio-production.ps1',import.meta.url),'utf8');
test('Android Studio release installer only accepts canonical signed Production and current code',()=>{
 for(const x of ['com.ribhlab.rivoscan','aapt dump badging','apksigner.bat','rivoscan-version.properties','if($code -lt 103 -or $code -ne $sourceCode)'])assert.ok(s.includes(x));
 assert.doesNotMatch(s,/assembleDebug|app-debug\.apk|adb uninstall|pm clear|install -d/);
});
test('Checks signer and explicit consent before any in-place installation',()=>{
 assert.ok(s.includes('Signature $signer $oldApk'));
 assert.ok(s.includes('Signature $signer $ApkPath'));
 assert.ok(s.indexOf('if($oldSign -ne $newSign)')<s.indexOf('install -r $ApkPath'));
 assert.ok(s.includes('Read-Host "Signatures match.'));
 assert.ok(s.includes("if($yes -notmatch '^[yY]$')"));
});
