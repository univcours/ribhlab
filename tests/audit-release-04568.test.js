import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('audited tester release increments Android version and keeps original banner + signing',()=>{
 const flow=get('.github/workflows/rivoscan-04568-ultradeep-audit.yml');
 const meta=get('rivoscan-version.properties'),pkg=JSON.parse(get('package.json'));
 assert.equal(pkg.version,'0.45.68');
 assert.match(meta,/^versionCode=183$/m);assert.match(meta,/^versionName=0\.45\.68$/m);
 assert.match(flow,/branches: \[audit\/rivoscan-ultradeep-04568\]/);
 assert.match(flow,/versionCode='183' versionName='0\.45\.68'/);
 assert.match(flow,/4841809190/);
 assert.doesNotMatch(flow,/4841819190/);
 assert.match(flow,/5608742752/);
 assert.doesNotMatch(flow,/VITE_RIVO_ADMOB_REWARDED_ID:/);
 assert.match(flow,/e9b3e2779575ba08a91372fc3885eba01dd3e73e/);
 assert.match(flow,/No Google Play upload/);
 assert.match(flow,/AUDIT|audit|Audit/);
});
