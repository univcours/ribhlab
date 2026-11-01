import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const get=p=>readFileSync(new URL(p,root),'utf8');
const pkg=JSON.parse(get('package.json'));
const gradleMetadata=get('rivoscan-version.properties');
const ui=get('src/main.js');
test('Build and UI use the SAME semantic version source',()=>{
 assert.ok(gradleMetadata.includes('versionName='+pkg.version));
 const versionCode=/^versionCode=(\\d+)$/m.exec(gradleMetadata);
 assert.ok(versionCode,'Android versionCode must be declared');
 assert.ok(Number.isSafeInteger(Number(versionCode[1])) && Number(versionCode[1])>=29,
   'Android build number must not regress below the latest released code');
 assert.ok(ui.includes("version as appVersion } from '../package.json'"));
 assert.ok(ui.includes('class="rivo-build-version"'));
 assert.ok(ui.includes('RivoScan v'+ '$'+'{appVersion}'));
 assert.ok(ui.includes('rivo-library-version'));
 assert.ok(!ui.includes('Public Downloads storage needs the updated Android app'));
});
test('Icon-themed release badge is readable in mobile header and library',()=>{
 const theme=get('src/theme-brand.css');
 assert.ok(theme.includes('.rivo-build-version'));
 assert.ok(theme.includes('.rivo-library-version'));
 assert.ok(theme.includes('max-width:440px'));
});
