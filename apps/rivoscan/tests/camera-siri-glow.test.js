import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/polish-density.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('floating camera and primary Scan camera show animated Siri-inspired color edge',()=>{
  assert.match(css,/\/\* RivoScan Siri-inspired animated camera halo/);
  assert.match(css,/@keyframes rivoSiriCameraOrbit/);
  assert.match(css,/@keyframes rivoSiriCameraBreath/);
  assert.match(css,/\.floating-scan\.rivo-camera-fab::before/);
  assert.match(css,/\.floating-scan\.rivo-camera-fab::after/);
  assert.match(css,/#smart-scanner\.scan-action-primary::after/);
  for(const color of ['#36f3ff','#8885ff','#f26cd7','#86ffdd'])
    assert.ok(css.includes(color),'Missing rotating aura shade '+color);
});
test('animation cannot drift the camera button, block taps or hide the camera icon',()=>{
  const section=css.slice(css.indexOf('/* RivoScan Siri-inspired animated camera halo'));
  assert.ok(section.includes('pointer-events:none'));
  assert.ok(section.includes('isolation:isolate!important'));
  assert.ok(section.includes('z-index:2!important'));
  assert.ok(!/\.floating-scan\.rivo-camera-fab\s*\{[^}]*animation:/s.test(section),
    'Only the ring pseudo-elements should rotate, not the center-aligned button');
  assert.ok(main.includes('data-live-camera'));
  assert.ok(main.includes('id="smart-scanner"'));
});
test('reduced-motion preference has a non-animated glow fallback',()=>{
  const tail=css.slice(css.indexOf('/* RivoScan Siri-inspired animated camera halo'));
  assert.ok(tail.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(tail.includes('animation:none!important'));
  assert.ok(tail.includes('opacity:.42!important'));
});
