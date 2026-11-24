import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('header uses the new last-layer optical alignment and original five interactive elements',()=>{
  const main=read('src/main.js'),css=read('src/rivo-centered-header-04593.css');
  assert.match(main,/import '\.\/rivo-centered-header-04593\.css'/);
  const icons=main.match(/class="topbar-brand-icon"/g)||[];
  assert.equal(icons.length,1);
  for(const token of ['class="crumb"','rivo-build-version','class="rivo-top-controls"',
    'class="rivo-top-locale"','id="header-language"','id="header-sound-toggle"'])
    assert.ok(main.includes(token),token+' must remain interactive and present');
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(css,/align-items:center!important/);
  assert.match(css,/height:68px!important/);
  assert.match(css,/padding-block:0!important/);
  assert.match(css,/body\.rivo-native-android[\s\S]*?padding-top:0!important/);
  assert.match(css,/\.topbar-brand-icon[\s\S]*?align-self:center!important/);
  assert.match(css,/\.rivo-top-locale[\s\S]*?height:44px!important/);
});
test('versioned release is new, with original package and no duplicate scanner',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'0.45.94');
  const code=read('rivoscan-version.properties');
  assert.match(code,/^versionName=0\.45\.94$/m);
  assert.match(code,/^versionCode=209$/m);
  const cfg=JSON.parse(read('capacitor.config.json'));
  assert.equal(cfg.appId,'com.ribhlab.rivoscan');
  const main=read('src/main.js');
  assert.match(main,/rivo-nav-scan-ring[^\n]*ico\('camera',29\)/);
  assert.doesNotMatch(main,/class="floating-scan rivo-camera-fab"/);
});
