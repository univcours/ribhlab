import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const icon=readFileSync(new URL('../public/icon.svg',import.meta.url),'utf8').toLowerCase();
const theme=readFileSync(new URL('../src/theme-brand.css',import.meta.url),'utf8').toLowerCase();
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('Brand theme reuses approved SVG logo colors in all major UI surfaces',()=>{
 for(const color of ['#ffffff','#04bcf7','#087dfa','#2328dd','#d8e9ff']){
  assert.ok(icon.includes(color), 'logo missing '+color);
  assert.ok(theme.includes(color), 'theme missing '+color);
 }
 for(const part of ['.rivo-dark-ui .topbar','.rivo-home .rivo-tile','.rivo-dark-ui .mobilebar','.rivo-hub-tile','.rivo-pages-modal','.rivo-editor-window','.bulk-sheet']){
  assert.ok(theme.includes(part), 'brand theming missing '+part);
 }
});
test('Native light system bar matches the white app icon and prevents dark-status contrast errors',()=>{
 assert.ok(main.includes("import './theme-brand.css'"));
 assert.ok(main.includes("StatusBar.setBackgroundColor({color:'#FFFFFF'})"));
 assert.ok(main.includes('StatusBar.setStyle({style:Style.Light})'));
});
