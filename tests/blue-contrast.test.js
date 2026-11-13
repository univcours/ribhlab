import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const theme=readFileSync(new URL('../src/rivo-blue-theme.css',import.meta.url),'utf8');
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
 .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
const lum=hex=>rgb(hex).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const m=[lum(a),lum(b)].sort((a,b)=>b-a);return (m[0]+.05)/(m[1]+.05)};
const mix=(bright,dark,alpha)=>'#'+[1,3,5].map(i=>{
 const b=parseInt(bright.slice(i,i+2),16),d=parseInt(dark.slice(i,i+2),16);
 return Math.round(b*(1-alpha)+d*alpha).toString(16).padStart(2,'0')}).join('').toUpperCase();
test('AA text contrast: light surfaces dark navy; dark surfaces white',()=>{
 const pairs=[['#082752','#E9F5FB'],['#082752','#F5FAFF'],['#11407F','#E9F5FB'],
  ['#FFFFFF','#061427'],['#FFFFFF','#082752'],['#FFFFFF','#0E61C2'],
  ['#FFFFFF','#11407F']];
 for(const [fg,bg] of pairs)assert.ok(ratio(fg,bg)>=4.5,`${fg} against ${bg}: ${ratio(fg,bg).toFixed(2)}`);
});
test('Gradient button overlays darken bright cyan for readable white labels',()=>{
 const gradients=[['#0E61C2',0],['#0878E8',.3],['#26A6F5',.52],['#00D8FF',.72]];
 for(const [color,alpha] of gradients)assert.ok(ratio('#FFFFFF',mix(color,'#061427',alpha))>=4.5,color);
 assert.match(theme,/--rivo-button-contrast-gradient:/);
 assert.match(theme,/rgba\(6,20,39,\.72\)/);
});
test('System typography supports Arabic and Latin without shipped font files',()=>{
 assert.match(theme,/Noto Sans Arabic/);
 assert.match(theme,/--rivo-type-body:14px/);
 assert.match(theme,/--rivo-type-section:17px/);
 assert.match(theme,/line-height:1\.55/);
 assert.match(theme,/min-height:44px/);
});

test('Settings secondary captions stay readable on Ice Blue',()=>{
 assert.match(theme,/\.app-settings \.page-heading p/);
 assert.match(theme,/\.rivo-pref-section-subtitle/);
 assert.match(theme,/settings-identity small/);
 assert.match(theme,/color:#11407F!important;opacity:1!important/);
});
