import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const monetization=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');

test('production settings hide AdMob diagnostics behind a dev-only gate',()=>{
 const start=main.indexOf('function settingsWorkspace(){');
 const end=main.indexOf('function card(t)',start);
 assert.ok(start>=0&&end>start,'Settings renderer must exist');
 const settings=main.slice(start,end);
 assert.ok(settings.includes('${import.meta.env.DEV ? `<div class="settings-section rivo-ad-diagnostics"'),'Developer-only gate must wrap diagnostics');
 assert.ok(settings.includes('</div>` : \'\'}'),'Diagnostics markup must close before About section');
});

test('rewarded-ad unavailability does not direct consumers to internal debugging',()=>{
 for(const text of ['Open Me → Ad diagnostics','Diagnostics publicitaires','تشخيص الإشهارات'])
  assert.equal(monetization.includes(text),false,'Private debugging reference leaked to users');
});
