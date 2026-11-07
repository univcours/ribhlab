import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../prepare-rivoscan-production-android-studio.ps1',import.meta.url),'utf8');
test('Manual Android Studio production preparation uses ONLY two real AdMob units',()=>{
  assert.ok(script.includes("$env:VITE_RIVOSCAN_ADMOB_PRODUCTION='true'"));
  assert.ok(script.includes("$env:RIVOSCAN_ADMOB_PRODUCTION='true'"));
  assert.ok(script.includes("$env:VITE_RIVOSCAN_ADMOB_APP_ID=$expectedAppId"));
  assert.ok(script.includes('ca-app-pub-7945572016731367/5608742752'));
  assert.ok(script.includes('ca-app-pub-7945572016731367/6270875707'));
  assert.ok(script.includes('An old rewarded-video ad unit is present. Production build blocked.'));
  assert.ok(script.includes('npx.cmd cap sync android'));
  assert.ok(script.includes('install-live-scanner.ps1'));
  assert.ok(script.includes('Generate Signed Bundle / APK'));
  assert.ok(!script.includes('jarsigner'));
  assert.ok(!script.includes('adb uninstall'));
});
test('Production Studio preparation validates a new source revision before manual signing',()=>{
  assert.ok(script.includes('git.exe -C $gitRoot fetch --no-tags origin'));
  assert.ok(script.includes('merge --ff-only'));
  assert.ok(script.includes('if($latest -ne $revision)'));
  assert.ok(script.includes('versionCode is older than 102'));
});
