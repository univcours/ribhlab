import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const wirelessSerial='adb-RIVO_TEST (2)._adb-tls-connect._tcp';
const devicesOutput=[
  'List of devices attached',
  wirelessSerial+'\tdevice product:samsung model:SM_TEST',
  '',
].join('\n');

test('Samsung wireless-debugging mDNS serial with spaces is parsed completely',()=>{
  const matcher=/^\s*(.+?)\s+device(?:\s|$)/;
  const extracted=devicesOutput.split('\n')
    .map(line=>matcher.exec(line)?.[1]).filter(Boolean);
  assert.deepEqual(extracted,[wirelessSerial]);
  assert.equal(matcher.exec('List of devices attached'),null);
  assert.equal(matcher.exec('adb-SOMEOTHER\toffline'),null);
});

test('real PowerShell installer, guard and diagnosis retain complete spaced serial',()=>{
  for(const path of ['sync-rivoscan-device-version.ps1','install-rivoscan-android.ps1','verify-rivoscan-on-phone.ps1']){
    const script=read(path);
    assert.ok(script.includes('(.+?)\\s+device'),path+' truncates wireless serial');
    assert.ok(script.includes('$matches[1]'),path+' must select regex serial capture');
  }
  const guard=read('sync-rivoscan-device-version.ps1');
  const installer=read('install-rivoscan-android.ps1');
  assert.ok(guard.includes('$adb -s $serial shell pm path'));
  assert.ok(installer.includes('$adb -s $serial install -r $apk'));
  assert.ok(!installer.includes('install -r -d $apk'),'must never downgrade');
  assert.ok(!installer.includes('adb uninstall'),'never uninstall user files');
});

test('Android Studio Gradle versionCode preflight no longer splits mDNS serial at spaces',()=>{
  const gradle=read('rivoscan-version.gradle');
  assert.ok(gradle.includes('matcher.group(1).trim()'));
  assert.ok(gradle.includes('matcher.matches()'));
  assert.ok(!gradle.includes('it.trim().split(/\\s+/)[0]'));
  assert.ok(gradle.includes("new ProcessBuilder(adb.absolutePath, '-s', serial"));
});

test('real PowerShell adb mock roundtrip includes a spaced wireless serial',()=>{
  const src=read('tests/debug-version-roundtrip.ps1');
  assert.ok(src.includes(wirelessSerial));
  assert.ok(src.includes('versionCode=146'));
  assert.ok(src.includes('No real phone'));
});
