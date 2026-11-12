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
