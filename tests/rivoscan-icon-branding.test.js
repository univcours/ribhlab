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
 assert.equal(createHash('sha256').update(logo).digest('hex'),'e2e1626a748593fd71e39c00bb3826a6de16b365ecfc344e8807549ab1b4dc8f');
 assert.equal(createHash('sha256').update(foreground).digest('hex'),'f5c47d04492612a704d025b7da2d8b32eaa13a210616c19557aba42b1f439de7');
 assert.equal(fullLogo.readUInt32BE(16),1254);
 assert.equal(createHash('sha256').update(fullLogo).digest('hex'),'06e9925f914dc19c25e43a2d80e3befa0533c308d6b0ccd6bcfb09a082888b24');
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
 assert.ok(ps.includes('<solid android:color="#FFFFFF"/>'),'use white launcher background to match exact supplied logo');
 assert.ok(ps.includes('<foreground android:drawable="@drawable/rivoscan_launcher_adaptive"/>'));
 assert.ok(ps.includes('mipmap-anydpi-v26/ic_launcher.xml'));
 const main=text('src/main.js'),html=text('index.html');
 assert.ok(main.includes('/rivoscan-icon.png'));
 assert.ok(!main.includes('/icon.svg'));
 assert.ok(html.includes('/rivoscan-icon.png'));
});
