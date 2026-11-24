import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/rivo-classic-04572.css');
const main=read('src/main.js');

test('AUTO has a dedicated visible element, select stays accessible',()=>{
 assert.match(main,/const visibleLocaleChoice=isAutoLanguage\(localStorage\)\?'AUTO':language\.toUpperCase\(\)/);
 assert.match(main,/class="rivo-locale-visible-value" aria-hidden="true"/);
 assert.match(main,/id="header-language" aria-label="Language:/);
 assert.match(ui,/\.rivo-top-locale #header-language\s*\{/);
 assert.match(ui,/opacity:0!important/);
 assert.match(ui,/\.rivo-top-locale:focus-within/);
});
test('Home header, cards, search and documents have independent normal-flow sections',()=>{
 assert.match(ui,/\.app-home\.rivo-home\.rivo-compact-home\s*\{/);
 assert.match(ui,/overflow-y:auto!important/);
 assert.match(ui,/\.rivo-home \.rivo-feature-rail\s*\{/);
 assert.match(ui,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(ui,/\.rivo-home \.rivo-home-search-title-row\s*\{/);
 assert.match(ui,/\.rivo-home #home-recents\s*\{/);
 assert.match(ui,/@media\(max-width:420px\)/);
 assert.match(ui,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.doesNotMatch(ui,/position:absolute!important;[^}]*\.rivo-home-search-title-row/);
});
test('Tools scroll region retains space to scroll past the last card',()=>{
 assert.match(ui,/\.rivo-tools-hub \.rivo-tools-scroll\s*\{/);
 assert.match(ui,/overflow-x:hidden!important;overflow-y:auto!important/);
 assert.match(ui,/scroll-padding-bottom:32px!important/);
 assert.match(ui,/\.rivo-hub-grid>\.rivo-hub-tile\s*\{/);
});
test('Plate scanner is top camera and bottom independently scrolling results',()=>{
 assert.match(ui,/\.rivo-plate-overlay\.rivo-live-overlay \.rivo-live-split-stage\s*\{/);
 assert.match(ui,/grid-template-rows:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
 assert.match(ui,/\.rivo-plate-overlay\.rivo-live-overlay \.rivo-live-split-stage>\.rivo-live-results-pane\s*\{/);
 assert.match(ui,/grid-column:1!important;grid-row:2!important/);
 assert.match(ui,/overflow-y:auto!important/);
});
test('AdMob still uses original 320x50 native view; no content-overlay replacement',()=>{
 const native=read('src/rivo-native-ad-geometry.js');
 assert.match(native,/AD_WIDTH=320,AD_HEIGHT=50/);
 assert.match(ui,/rivo-banner-frame-height,63px/);
});
test('Release version 0.45.93 versionCode 206',()=>{
 assert.match(read('rivoscan-version.properties'),/^versionCode=208$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.93$/m);
 assert.equal(JSON.parse(read('package.json')).version,'0.45.93');
});
