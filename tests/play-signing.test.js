import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('signed Play release needs secret-keystore and real AdMob identifiers',()=>{
 const ci=read('.github/workflows/rivoscan-play-signed-release.yml');
 const ads=read('scripts/prepare-rivoscan-admob-release.mjs');
 const signing=read('scripts/prepare-rivoscan-signing.py');
 assert.ok(ci.includes('bundleRelease'));
 assert.ok(ci.includes('RIVO_ADMOB_APP_ID'));
 assert.ok(ci.includes('RIVO_UPLOAD_KEYSTORE_BASE64'));
 assert.ok(ci.includes('RIVO_UPLOAD_STORE_PASSWORD'));
 assert.ok(ci.includes('jarsigner -verify'));
 assert.ok(ads.includes('VITE_RIVO_ADMOB_MODE'));
 assert.ok(ads.includes('ca-app-pub-3940256099942544'));
 assert.ok(ads.includes('--check-only'));
 assert.ok(signing.includes("RIVO_SIGNING_KEYSTORE_PATH"));
 assert.ok(!ci.includes('keynovagrid'));
});

test('verified RivoScan AdMob public units and original Play upload key are wired',()=>{
 const flows=[
  '.github/workflows/rivoscan-play-signed-release.yml',
  '.github/workflows/rivoscan-correct-original-key.yml'
 ];
 for(const flow of flows){
  const ci=read(flow);
  assert.ok(ci.includes('VITE_RIVO_ADMOB_INTERSTITIAL_ID: ca-app-pub-7945572016731367/5608742752'));
  assert.ok(!ci.includes('VITE_RIVO_ADMOB_APP_OPEN_ID'));
  assert.ok(ci.includes('VITE_RIVO_ADMOB_REWARDED_ID: ca-app-pub-7945572016731367/4148993879'));
  assert.ok(ci.includes('VITE_RIVO_ADMOB_BANNER_ID: ca-app-pub-7945572016731367/4841809190'));
  assert.ok(ci.includes('VITE_RIVO_ADMOB_APP_ID: ca-app-pub-7945572016731367~1509328607'));
  assert.ok(ci.includes('secrets.RIVO_CORRECT_KEYSTORE_BASE64'));
  assert.ok(ci.includes('RIVO_UPLOAD_STORE_PASSWORD: ')&&ci.includes('secrets.RIVO_CORRECT_KEY_PASSWORD'));
  assert.ok(ci.includes('RIVO_UPLOAD_KEY_PASSWORD: ')&&ci.includes('secrets.RIVO_CORRECT_KEY_PASSWORD'));
  assert.ok(ci.includes('SHA1: E9:B3:E2:77:95:75:BA:08:A9:13:72:FC:38:85:EB:A0:1D:D3:E7:3E'));
  assert.ok(ci.includes('versionCode 124'));
  assert.ok(!ci.includes('secrets.PASSEKEY'));
  assert.ok(!ci.includes('7945572016731367~1688423435'));
  assert.ok(!ci.includes('keynovagrid'));
 }
});
