import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('0.45.88 upgrade stays on the same RivoScan package with a newer code',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'0.45.88');
 assert.match(read('rivoscan-version.properties'),/^versionCode=203$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.88$/m);
 assert.match(read('capacitor.config.json'),/com\.ribhlab\.rivoscan/);
});
test('lossless build keeps all device ABIs AND universal fallback',()=>{
 const a=read('scripts/configure-rivoscan-abi-splits.py');
 for(const arch of ['arm64-v8a','armeabi-v7a','x86','x86_64'])assert.ok(a.includes(arch),arch);
 assert.match(a,/universalApk true/);
 assert.match(a,/enable true/);
 assert.doesNotMatch(a,/minifyEnabled|shrinkResources|exclude\s+group|remove\s+dependency/);
});
test('proof compares every APK DEX class, ML Kit model, app asset and same-ABI .so',()=>{
 const s=read('scripts/verify-rivoscan-abi-content.py');
 for(const name of ['assets/','classes','mlkit','lib/','universal','sha256','native==expected','actual_common==common'])assert.ok(s.includes(name),name);
 assert.match(s,/digest\(universal,name\)==digest\(slim,name\)/);
 assert.match(s,/size<universal_size\*0\.75/);
});
test('signed APK release validates all variants, original signing cert and portrait',()=>{
 const workflow=read('.github/workflows/rivoscan-04588-master-audit.yml');
 assert.match(workflow,/scripts\/configure-rivoscan-abi-splits\.py/);
 assert.match(workflow,/scripts\/verify-rivoscan-abi-content\.py/);
 assert.match(workflow,/for ABI in universal arm64-v8a armeabi-v7a x86 x86_64/);
 assert.match(workflow,/screenOrientation/);
 assert.match(workflow,/e9b3e2779575ba08a91372fc3885eba01dd3e73e/);
 assert.match(workflow,/RivoScan-0\.45\.88-ARM64-SIGNED\.apk/);
 assert.match(workflow,/RivoScan-0\.45\.88-UNIVERSAL-SIGNED\.apk/);
 assert.doesNotMatch(workflow,/upload.*Google Play/i);
});
