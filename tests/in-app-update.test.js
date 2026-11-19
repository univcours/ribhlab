import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Google Play Core in-app immediate update is integrated into native Android wrapper',()=>{
 const installer=read('install-live-scanner.ps1');
 const plugin=read('native/android/RivoPlayUpdatePlugin.java');
 assert.match(installer,/RivoPlayUpdatePlugin\.java/);
 assert.match(installer,/registerPlugin\(RivoPlayUpdatePlugin\.class\)/);
 assert.match(installer,/com\.google\.android\.play:app-update:2\.1\.0/);
 assert.match(plugin,/AppUpdateManagerFactory\.create/);
 assert.match(plugin,/AppUpdateType\.IMMEDIATE/);
 assert.match(plugin,/DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS/);
});
test('Update prompted only by Play availability and not during active saving',()=>{
 const code=read('src/play-updates.js');
 const main=read('src/main.js');
 assert.match(code,/info\?\.available&&info\?\.allowed/);
 assert.match(code,/if\(!android\|\|working/);
 assert.match(code,/RivoPlayUpdate/);
 assert.match(main,/checkPlayUpdate\(\{language/);
 assert.match(main,/working:busy\|\|nativeCaptureDepth>0/);
});

test('Offline Android device continues using its installed app: no update modal',async()=>{
 const {playUpdateOnline}=await import('../src/play-updates.js');
 assert.equal(playUpdateOnline({onLine:false}),false);
 assert.equal(playUpdateOnline({onLine:true}),true);
 assert.equal(playUpdateOnline(undefined),true);
 const source=read('src/play-updates.js');
 assert.match(source,/window\.addEventListener\('offline',\(\)=>clearPrompt\(\)\)/);
 assert.match(source,/if\(!playUpdateOnline\(\)\)\{clearPrompt\(\);return false;\}/);
 assert.match(source,/if\(!playUpdateOnline\(\)\)\{clearPrompt\(\);return;\}/);
});
