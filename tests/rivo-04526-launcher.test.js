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
 const workflow=read('.github/workflows/rivoscan-04544-original-key.yml');
 assert.ok(workflow.includes('RIVO_CORRECT_KEYSTORE_BASE64'));
 assert.ok(workflow.includes('versionCode=150'));
 assert.ok(workflow.includes('0.45.46'));
 assert.ok(workflow.includes('assembleRelease bundleRelease'));
 assert.ok(workflow.includes('E9:B3:E2:77:95:75:BA:08:A9:13:72:FC:38:85:EB:A0:1D:D3:E7:3E'));
 const versions=read('rivoscan-version.properties');
 assert.match(versions,/versionCode=150/);
 assert.match(versions,/versionName=0\.45\.46/);
});
