import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Neo Glass dashboard uses the REAL RivoScan functionality and approved original logo',()=>{
 const main=read('src/main.js');
 const section=main.slice(main.indexOf('const RIVO_NEO_COPY='),main.indexOf('function toolsWorkspace(){'));
 for(const token of ['rivo-neo-hero','rivo-neo-card-grid','rivo-neo-card-','rivo-feature-rail','home-recents','home-quick-search','recentDocuments(14)']){
  assert.ok(section.includes(token),token);
 }
 for(const route of ["route:'data-live-camera'","route:'data-tab=\"tools\"'","route:'data-hub-action=\"idPhotoMaker\"'","route:'data-hub-action=\"photoTranslation\"'","route:'data-hub-action=\"convertDocument\"'"])
  assert.ok(section.includes(route),route);
 assert.ok(main.includes("document.querySelectorAll('[data-live-camera]')"));
 assert.ok(main.includes("document.querySelectorAll('[data-hub-action]')"));
 assert.ok(main.includes("document.querySelectorAll('[data-rivo-feature]')"));
 assert.match(main,/rivoscan-header-mark\.png/);
 assert.doesNotMatch(section,/data-premium-unlock|data-watch-rewarded/);
});
test('All seven languages have every new visible card label and meaningful summary',()=>{
 const main=read('src/main.js');
 const data=main.slice(main.indexOf('const RIVO_NEO_COPY='),main.indexOf('const RIVO_NEO_CARDS='));
 for(const locale of ['en','ar','fr','es','de','pt','it']){
  assert.match(data,new RegExp('(?:\\n|\\s)'+locale+':\\{hero:'));
 }
 for(const key of ['scan','pdf','id','translate','images','more'])assert.ok(data.includes(key+':['),key);
 assert.ok(main.includes('escapeHTML(neo[c.key][0])'));
 assert.ok(main.includes('escapeHTML(neo[c.key][1])'));
});
test('Final CSS overrides legacy tiny cards and fixed-height/hidden-scroll Android Home safely',()=>{
 const main=read('src/main.js'),css=read('src/rivo-neo-glass-04560.css');
 assert.ok(main.indexOf("import './rivo-neo-glass-04560.css';")>main.indexOf("import './rivo-id-photo-layout-04558.css';"));
 assert.match(css,/rivo-neo-dashboard/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/rivo-neo-card-grid/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/rivo-tools-hub \.rivo-hub-grid/);
 assert.match(css,/rivo-nav-scan-ring/);
 assert.match(css,/button:not\(\.active\):not\(:disabled\):not\(\.rivo-nav-scan\)/);
 assert.match(css,/#1a538c/i);
 assert.match(css,/-webkit-text-fill-color:#1a538c!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/\.rivo-ad-banner-slot\s*\{/);
});
