import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all Android app pages clip actual scrolling content before the native ad',()=>{
 const css=read('src/rivo-native-banner-layout.css');
 assert.match(css,/body\.rivo-native-android[\s\S]*#app/);
 assert.match(css,/\.content\{/);
 assert.match(css,/position:absolute!important/);
 assert.match(css,/bottom:var\(--rivo-content-bottom/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/pointer-events:none!important/);
 const main=read('src/main.js');
 assert.ok(main.includes("import './rivo-native-banner-layout.css'"));
 const ad=read('src/monetization.js');
 assert.ok(ad.includes('calculateAdLayout('));
 assert.ok(ad.includes('state.bannerHidden=true'));
 assert.ok(ad.includes('margin:bannerLastMargin'));
 assert.ok(ad.includes('.rivo-shield-overlay'));
 assert.ok(ad.includes('.rivo-merged-overlay'));
});
test('all info controls have fixed circular dimensions and simple i glyph',()=>{
 const style=read('src/rivo-native-banner-layout.css');
 assert.match(style,/aspect-ratio:1\/1!important/);
 assert.match(style,/border-radius:50%!important/);
 assert.match(style,/min-height:32px!important;max-height:32px!important/);
 assert.match(read('src/tool-help.js'),/button\.textContent='i'/);
});
test('launcher is a symbol-only R, separately inset for Android adaptive masks',()=>{
 const code=read('scripts/create-turquoise-icon.mjs');
 assert.match(code,/assets\/branding\/rivoscan-ai-icon-source\.png/);
 assert.match(code,/public\/rivoscan-adaptive-foreground\.png/);
 assert.match(code,/public\/rivoscan-store-icon\.png/);
 assert.match(code,/Symbol-only large R ready/);
 assert.ok(!code.includes('card(icon,137'));
});
