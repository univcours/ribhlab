import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../verify-rivoscan-on-phone.ps1',import.meta.url),'utf8');
test('Phone verification distinguishes missing, unauthorized, offline and multiple devices',()=>{
 for(const phrase of [
 'ADB: ','Connected Android devices reported by ADB:',
 'unauthorized','offline','More than one authorized device',
 'ADB sees NO Android devices','-DeviceSerial','USB debugging is UNAUTHORIZED'
 ])assert.ok(s.includes(phrase),phrase);
 assert.ok(s.includes('@(& $adb start-server)'));
 assert.ok(s.includes('shell pm path $packageId'));
 assert.ok(s.includes("Id='com.ribhlab.rivoscan'"));
 assert.ok(s.includes("Id='com.ribhlab.rivoscan.debug'"));
 assert.doesNotMatch(s,/adb\s+uninstall|pm\s+clear|install\s+-r/);
});
