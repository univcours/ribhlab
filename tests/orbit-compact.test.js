import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=load('../src/rivo-orbit-compact.css');
const main=load('../src/main.js');

test('compact Home and Tools shrink tiles without sacrificing four readable quick actions',()=>{
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/height:66px!important;min-height:66px!important;max-height:66px!important/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/min-height:79px!important;height:auto!important/);
 assert.match(css,/font-size:clamp\(11px,3vw,11\.5px\)/);
 for(const id of ['smartAutoCapture','scanCode','perfectScanQuality','privacyShield'])
  assert.ok(main.includes(id),id+' is still actionable');
});

test('real file rows take priority and keep the user documents large enough to read',()=>{
 assert.match(css,/min-height:calc\(100dvh - 350px\)!important/);
 assert.match(css,/height:57px!important;min-height:57px!important;max-height:57px!important/);
 assert.match(css,/font-size:13px!important;line-height:1\.2!important/);
 assert.match(css,/height:39px!important/);
});

test('cyan orbit runs on compact cards and scanner button, not on whole card transforms',()=>{
 assert.match(css,/@property --rivo-orbit-angle/);
 assert.match(css,/@keyframes rivo-orbit-border/);
 assert.match(css,/conic-gradient\(from var\(--rivo-orbit-angle\)/);
 assert.match(css,/\.rivo-nav-scan-ring::before/);
 assert.match(css,/animation:rivo-orbit-border 3\.8s linear infinite/);
 assert.match(css,/animation:rivo-orbit-border 14s linear infinite/);
 assert.match(css,/\.rivo-hub-tile:is\(:hover,:focus,:focus-visible,:active\)::before/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.ok(!css.includes('animation:rivo-orbit-border 1s'),'glow should be subtle');
});

test('compact visible labels are short in seven locales while assistive labels stay descriptive',()=>{
 const locales=['en','ar','fr','es','de','pt','it'];
 for(const locale of locales)assert.match(main,new RegExp(' '+locale+':\\{smartAutoCapture:'));
 assert.match(main,/aria-label="\$\{escapeHTML\(featureText\(f.label\)\)\}"/);
 assert.match(main,/escapeHTML\(compactFeatureLabel\(f.id\)\)/);
});
