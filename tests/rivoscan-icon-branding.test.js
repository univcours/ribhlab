import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url));
const text=path=>file(path).toString('utf8');
const logo=file('assets/branding/rivoscan-icon-source.png');
const foreground=file('assets/branding/rivoscan-icon-adaptive-foreground.png');
const fullLogo=file('assets/branding/rivoscan-logo-original.png');
test('approved user-supplied R+scan brand icons are valid 512px PNG resources',()=>{
 for(const png of [logo,foreground]){
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),512);
  assert.equal(png.readUInt32BE(20),512);
 }
 assert.equal(createHash('sha256').update(logo).digest('hex'),'87d17709595d8bef594532b5c0c08994c59f2f04c333035ee7f3ebe774d359a3');
 assert.equal(createHash('sha256').update(foreground).digest('hex'),'4901ac6546af419fedda177b5a5a990a9eb3a730ba862f00bc34d371534f08ba');
 assert.equal(fullLogo.readUInt32BE(16),1254);
 assert.equal(createHash('sha256').update(fullLogo).digest('hex'),'b22131994543c51ba2adbf5b278a76163547a3749162959687b2f7b35828e803');
});
test('build uses exact approved icon, never regenerates the old colored drawing',()=>{
 const gen=text('scripts/create-turquoise-icon.mjs');
 assert.ok(gen.includes('assets/branding/rivoscan-icon-source.png'));
 assert.ok(gen.includes('assets/branding/rivoscan-icon-adaptive-foreground.png'));
 assert.ok(gen.includes('public/rivoscan-icon.png'));
 assert.ok(gen.includes('assets/branding/rivoscan-logo-original.png'));
 assert.ok(gen.includes('public/rivoscan-logo.png'));
 assert.ok(!gen.includes('pngquant'));
 assert.ok(!gen.includes('palette'));
 assert.ok(!gen.includes('function paint('));
});
test('Android legacy and adaptive launchers use the approved brand image',()=>{
 const ps=text('apply-rivoscan-branding.ps1');
 assert.ok(ps.includes('rivoscan_launcher_adaptive.png'));
 assert.ok(ps.includes('<foreground android:drawable="@drawable/rivoscan_launcher_adaptive"/>'));
 assert.ok(ps.includes('mipmap-anydpi-v26/ic_launcher.xml'));
 const main=text('src/main.js'),html=text('index.html');
 assert.ok(main.includes('/rivoscan-icon.png'));
 assert.ok(!main.includes('/icon.svg'));
 assert.ok(html.includes('/rivoscan-icon.png'));
});
