import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const legacy = readFileSync(new URL('../src/premium-home.css', import.meta.url), 'utf8');
const modern = readFileSync(new URL('../src/turquoise-v2.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('compact turquoise tiles supersede legacy portrait aspect ratio for all three grids', () => {
  assert.match(legacy, /aspect-ratio:4\/5!important/, 'regression test must cover actual legacy rule');
  const compact = modern.slice(modern.indexOf('/* Compact scanner dashboard'));
  for(const cls of ['.rivo-scan-mode', '.rivo-premium-tile', '.rivo-hub-tile']) {
    assert.ok(compact.includes(cls), 'missing compact override: '+cls);
  }
  assert.match(compact, /aspect-ratio:auto!important/);
  assert.match(compact, /flex-direction:row!important/);
  assert.match(compact, /min-height:76px!important/);
  assert.match(compact, /min-height:68px!important/);
  assert.doesNotMatch(compact, /aspect-ratio:4\/5/);
  const legacyImport=main.indexOf("import './premium-home.css'");
  const modernImport=main.indexOf("import './turquoise-v2.css'");
  assert.ok(legacyImport>=0 && modernImport>legacyImport, 'compact theme must load after legacy CSS');
});
