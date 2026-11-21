import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const icon=readFileSync(new URL('../public/rivoscan-icon.png',import.meta.url));

test('the header keeps the ORIGINAL RivoScan app logo inside its rounded icon frame',()=>{
  assert.match(main, /<span class="rivo-header-app-icon"><img class="topbar-brand-icon" src="\/rivoscan-icon\.png"/);
  assert.match(main, /<\/span><strong>RivoScan<\/strong>/);
  assert.deepEqual([...icon.subarray(0,8)],[137,80,78,71,13,10,26,10],'app logo must remain the existing PNG');
});

test('header app icon has a real border, rounded corners and phone-sized responsive layout',()=>{
  assert.match(css, /#app \.rivo-dark-ui \.rivo-header-app-icon\{[^}]*border-radius:13px;[^}]*border:1\.5px solid #F5FAFF;[^}]*box-shadow:/s);
  assert.match(css, /#app \.rivo-dark-ui \.rivo-header-app-icon \.topbar-brand-icon\{[^}]*object-fit:contain;[^}]*filter:none;/s);
  assert.match(css, /@media\(max-width:780px\)\{[^}]*\.rivo-header-app-icon\{[^}]*width:40px;[^}]*height:40px;/s);
});
