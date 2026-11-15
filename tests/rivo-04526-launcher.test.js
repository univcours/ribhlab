import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the new launcher has no RivoScan wordmark and Play uses a full-bleed asset',()=>{
 const script=read('scripts/create-turquoise-icon.mjs');
 assert.match(script,/SOURCE_SHA256/);
 assert.match(script,/sizes=\{play:504,adaptive:360,header:456\}/);
 assert.match(script,/without wordmark/);
 assert.match(script,/public\/rivoscan-play-icon\.png/);
 assert.match(script,/public\/rivoscan-adaptive-foreground\.png/);
 assert.match(script,/image host HTTP/);
});
test('Android build uses the original signature and strictly increasing version',()=>{
 const workflow=read('.github/workflows/rivoscan-correct-original-key.yml');
 assert.ok(workflow.includes('RIVO_CORRECT_KEYSTORE_BASE64'));
 assert.ok(workflow.includes('versionCode 130'));
 assert.ok(workflow.includes('0.45.26'));
 assert.ok(!workflow.includes('cmp public/rivoscan-icon.png public/rivoscan-adaptive-foreground.png'));
 const versions=read('rivoscan-version.properties');
 assert.match(versions,/versionCode=130/);
 assert.match(versions,/versionName=0\.45\.26/);
});
