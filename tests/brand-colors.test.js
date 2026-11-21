import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const icon=read('public/icon.svg');
const theme=read('src/rivo-blue-theme.css');
const oldTheme=read('src/theme-brand.css');
const main=read('src/main.js');
const brand=read('apply-rivoscan-branding.ps1');
const build=JSON.parse(read('package.json'));
const palette=['#061427','#082752','#11407F','#0E61C2','#0878E8','#26A6F5','#00D8FF','#E9F5FB','#F5FAFF','#FFFFFF','#B8D9F2'];
test('Premium Blue palette is the only design palette of major surfaces and scanner logo',()=>{
 for(const color of ['#061427','#0E61C2','#00D8FF','#E9F5FB']){
  assert.ok(icon.includes(color),'logo missing '+color);
  assert.ok(theme.includes(color),'design tokens missing '+color);
 }
 assert.match(theme,/--rivo-main-gradient:linear-gradient\(135deg/);
 assert.match(theme,/--rivo-button-gradient:linear-gradient\(135deg/);
 assert.match(theme,/--rivo-paper-gradient:linear-gradient\(180deg/);
 for(const part of ['.rivo-dark-ui .topbar','.rivo-dark-ui .mobilebar',
  '.rivo-code-dialog','.rivo-id-dialog','.rivo-live-overlay','.rivo-ad-banner-slot'])
  assert.ok(theme.includes(part),'theme area missing '+part);
 assert.ok(oldTheme.includes('.rivo-perfectscan-modal'));
 assert.ok(brand.includes('scripts/create-turquoise-icon.mjs'));
 assert.ok(build.scripts.prebuild.includes('create-turquoise-icon.mjs'));
 const generator=read('scripts/create-turquoise-icon.mjs');
 assert.ok(generator.includes('node_modules/.cache/rivoscan/icon.png.b64'));
 assert.ok(generator.includes('assets/branding/rivoscan-icon-source.png'));
 assert.ok(generator.includes('public/rivoscan-icon.png'));
 assert.ok(brand.includes('rivoscan_launcher_adaptive.png'));
 assert.ok(brand.includes('node_modules/.cache/rivoscan/icon.png.b64'));
 for(const source of ['src/style.css','src/theme-brand.css','src/premium-home.css',
  'src/compact-turquoise.css','src/privacy-shield.css','src/rivo-design-system.css',
  'src/modal-shell.css','public/icon.svg']){
   const raw=read(source);
   const bad=['#079b97','#079d99','#0acbbd','#13d9cd','#079a9a','#04bcf7'];
   for(const c of bad)assert.ok(!raw.toLowerCase().includes(c),'obsolete color '+c+' in '+source);
 }
});
test('Ice Blue independent Android status bar has dark readable system icons',()=>{
 assert.ok(main.includes("import './rivo-blue-theme.css'"));
 assert.ok(main.includes("StatusBar.setBackgroundColor({color:'#E9F5FB'})"));
 assert.ok(main.includes('StatusBar.setStyle({style:Style.Light})'));
 assert.ok(read('install-live-scanner.ps1').includes('getWindow().setStatusBarColor(Color.rgb(233,245,251));'));
});
