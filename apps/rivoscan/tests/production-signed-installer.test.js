import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Signed production builder uses canonical Release and never Debug',()=>{
  const s=get('build-rivoscan-production-signed.ps1');
  assert.ok(s.includes('prepare-rivoscan-production-android-studio.ps1'));
  assert.ok(s.includes("':app:bundleRelease' ':app:assembleRelease'"));
  assert.ok(s.includes('app-release-unsigned.apk'));
  assert.ok(s.includes('app-release.aab'));
  assert.ok(s.includes('com.ribhlab.rivoscan'));
  assert.doesNotMatch(s,/assembleDebug|app-debug\.apk|com\.ribhlab\.rivoscan\.debug/);
  assert.ok(s.includes('versionCode='));
});
test('Signed production builder verifies certificate equality BEFORE any in-place ADB update',()=>{
  const s=get('build-rivoscan-production-signed.ps1');
  assert.ok(s.includes('Get-ApkCertificateDigest $apksigner $existingBase'));
  assert.ok(s.includes('Get-ApkCertificateDigest $apksigner $signedApk'));
  assert.ok(s.indexOf('if($oldDigest -ne $newDigest)') < s.indexOf('install -r $signedApk'));
  assert.ok(s.includes('Read-Host (\'Certificates match. Update Production'));
  assert.ok(s.includes('CERTIFICATES DIFFER. Direct update is BLOCKED'));
  assert.ok(s.includes('if([long]$installedCode.Groups[1].Value -ge $code)'));
  const nonComments=s.split(/\r?\n/).filter(x=>!x.trimStart().startsWith('#')).join('\n');
  assert.doesNotMatch(nonComments,/\b(?:adb\s+uninstall|pm\s+clear|install\s+-r\s+-d)\b/);
});
test('Signing passwords are prompted locally, never printed or committed',()=>{
  const s=get('build-rivoscan-production-signed.ps1');
  assert.ok(s.includes("Read-Host $label -AsSecureString"));
  assert.ok(s.includes('--ks-pass env:RIVOSCAN_RELEASE_STOREPASS'));
  assert.ok(s.includes('--key-pass env:RIVOSCAN_RELEASE_KEYPASS'));
  assert.ok(s.includes("'-storepass:env' 'RIVOSCAN_RELEASE_STOREPASS'"));
  assert.ok(s.includes('Remove-Item Env:RIVOSCAN_RELEASE_STOREPASS'));
});
