import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const icon=readFileSync(new URL('../public/icon.svg',import.meta.url),'utf8').toLowerCase();
const theme=readFileSync(new URL('../src/theme-brand.css',import.meta.url),'utf8').toLowerCase();
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const brand=readFileSync(new URL('../apply-rivoscan-branding.ps1',import.meta.url),'utf8');
const build=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('Full turquoise theme and icon use matching palette in all major surfaces',()=>{
 for(const color of ['#13d9cd','#079a9a','#06565f','#e0faf4'])assert.ok(icon.includes(color),'icon missing '+color);
 for(const color of ['#0cb6aa','#089b99','#056f72'])assert.ok(theme.includes(color),'theme missing '+color);
 for(const part of ['.rivo-dark-ui .topbar','.rivo-home .rivo-tile','.rivo-dark-ui .mobilebar',
  '.rivo-perfectscan-modal','.rivo-editor-window','.library-selection-toolbar'])
  assert.ok(theme.includes(part),'theme area missing '+part);
 assert.ok(brand.includes('scripts/create-turquoise-icon.mjs'));
 assert.ok(brand.includes('#0aa59d'));
 assert.ok(build.scripts.prebuild.includes('create-turquoise-icon.mjs'));
});
test('Native system bar remains white and readable',()=>{
 assert.ok(main.includes("import './theme-brand.css'"));
 assert.ok(main.includes("StatusBar.setBackgroundColor({color:'#FFFFFF'})"));
 assert.ok(main.includes('StatusBar.setStyle({style:Style.Light})'));
});
