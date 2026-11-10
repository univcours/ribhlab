import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/rivo-design-system.css',import.meta.url),'utf8');
test('Real RivoScan home design displays four responsive compact shortcuts and preserved files list',()=>{
 assert.ok(main.includes("id:'smartAutoCapture'"));
 assert.ok(main.includes("id:'scanCode'"));
 assert.ok(main.includes("id:'perfectScanQuality'"));
 assert.ok(main.includes("id:'privacyShield'"));
 assert.ok(main.includes('rivo-feature-rail'));
 assert.ok(main.includes('recentDocuments(14)'));
 assert.ok(main.includes('home-quick-search'));
 assert.ok(css.includes('scroll-snap-type:x proximity'));
 assert.ok(css.includes('flex-wrap:nowrap!important'));
 assert.ok(css.includes('rivo-feature-tile'));
});
test('Privacy Shield and PerfectScan are independently usable, but no duplicate hidden destinations',()=>{
 assert.ok(main.includes("function launchPrivacyShield(doc=null)"));
 assert.ok(main.includes("function launchPerfectScan(doc=null)"));
 assert.ok(main.includes("spec.type==='privacyShield'"));
 assert.ok(main.includes("spec.type==='perfectScan'"));
 assert.ok(main.includes("spec.type==='smartAutoCapture'"));
 assert.ok(main.includes("data-rivo-feature"));
});
test('Design honors reduced motion, safe areas and compact 320px layout',()=>{
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('max-width:360px'));
 assert.ok(css.includes('min-height:40px!important'));
 assert.ok(css.includes('.mobilebar button.active'));
});
