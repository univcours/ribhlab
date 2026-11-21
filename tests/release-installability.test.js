import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('debug APK verification dynamically uses current release version',()=>{
 const flow=read('.github/workflows/rivoscan-standalone-android.yml');
 const props=read('rivoscan-version.properties');
 assert.match(props,/^versionCode=152$/m);
 assert.match(props,/^versionName=0\.45\.48$/m);
 assert.match(flow,/VERSION_CODE="\$\(sed -n/);
 assert.match(flow,/VERSION_NAME="\$\(sed -n/);
 assert.ok(flow.includes("versionCode='$VERSION_CODE' versionName='$VERSION_NAME'"));
 assert.ok(!flow.includes("versionCode='148' versionName='0.45.44'"));
});
