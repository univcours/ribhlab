import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('The native integration enables release symbols without changing R8 or signing',()=>{
 const s=file('configure-play-debug-symbols.ps1');
 const native=file('install-live-scanner.ps1');
 assert.ok(native.includes("configure-play-debug-symbols.ps1"));
 assert.ok(s.includes("debugSymbolLevel 'SYMBOL_TABLE'"));
 assert.ok(s.includes('Exactly one Android release block expected'));
 assert.ok(s.includes('minifyEnabled'));
 assert.ok(!/pm clear|adb uninstall|jarsigner/.test(s));
});

test('The Play AAB workflow parses helper and retains only genuinely generated symbols',()=>{
 const w=file('../../.github/workflows/rivoscan-play-aab.yml');
 assert.ok(w.includes("'./configure-play-debug-symbols.ps1'"));
 assert.ok(w.includes('outputs/native-debug-symbols/release/native-debug-symbols.zip'));
 assert.ok(w.includes('outputs/mapping/release/mapping.txt'));
 assert.ok(w.includes('if-no-files-found: warn'));
 assert.ok(w.includes('RivoScan-PLAY-DIAGNOSTICS'));
});
