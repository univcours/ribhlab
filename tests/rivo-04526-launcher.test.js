import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the new launcher has no RivoScan wordmark and Play uses a full-bleed asset',()=>{
 const script=read('scripts/create-turquoise-icon.mjs');
 assert.match(script,/rivoscan-ai-icon-source\.png/);
 assert.match(script,/new PNG\(\{width:512,height:512\}\)/);
 assert.match(script,/symbol-only/i);
 assert.match(script,/public\/rivoscan-store-icon\.png/);
 assert.match(script,/public\/rivoscan-adaptive-foreground\.png/);
 assert.match(script,/RivoScan approved icon fetch failed/);
});
test('Android build uses the original signature and strictly increasing version',()=>{
 const workflow=read('.github/workflows/rivoscan-correct-original-key.yml');
 assert.ok(workflow.includes('RIVO_CORRECT_KEYSTORE_BASE64'));
 assert.ok(workflow.includes('versionCode 135'));
 assert.ok(workflow.includes('0.45.31'));
 assert.ok(workflow.includes('! cmp -s public/rivoscan-icon.png public/rivoscan-adaptive-foreground.png'));
 const versions=read('rivoscan-version.properties');
 assert.match(versions,/versionCode=135/);
 assert.match(versions,/versionName=0\.45\.31/);
});
