import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const flow=readFileSync(new URL('../.github/workflows/rivoscan-correct-original-key.yml',import.meta.url),'utf8');
test('RivoScan Play AAB uses only dedicated original keystore secrets and exact Play fingerprint',()=>{
 assert.ok(flow.includes('secrets.RIVO_CORRECT_KEYSTORE_BASE64'));
 assert.ok(flow.includes('secrets.RIVO_CORRECT_KEY_PASSWORD'));
 assert.ok(!flow.includes('secrets.PASSEKEY'));
 assert.ok(!flow.includes('secrets.RIVO_UPLOAD_KEYSTORE_BASE64'));
 assert.ok(flow.includes('E9:B3:E2:77:95:75:BA:08:A9:13:72:FC:38:85:EB:A0:1D:D3:E7:3E'));
 assert.ok(flow.includes('keytool -printcert -jarfile'));
 assert.ok(flow.includes('bundleRelease'));
 // This legacy workflow must never rebuild/publish 0.45.40 from a newer
 // 0.45.42+ branch. Its historical release is pinned and manually dispatched.
 assert.ok(flow.includes('ref: rivoscan-0.45.40-original-key'));
 assert.match(flow,/on:\\n  workflow_dispatch:\\n/);
 assert.doesNotMatch(flow,/\\n  push:\\n/);
 assert.ok(flow.includes('TAG=rivoscan-0.45.40-original-key'));
});
