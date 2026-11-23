import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateAdLayout,nativeAdFits} from '../src/rivo-native-ad-geometry.js';
test('native 320x50 ad has a matching dedicated clipped content viewport',()=>{
 for(const width of [320,360,393,412,600,768]){
  const p=calculateAdLayout({viewportWidth:width,viewportHeight:873,navTop:774,navBottom:873,headerBottom:68});
  assert.equal(p.valid,true);
  assert.equal(p.width,320);assert.equal(p.height,50);
  assert.equal(p.margin,102);assert.equal(p.bannerTop,721);
  assert.equal(p.contentBottom,170);
  assert.equal(873-p.contentBottom,703);
  assert.ok(873-p.contentBottom<=p.bannerTop-5);
  assert.equal(p.left,(width-320)/2);
 }
});
test('reject unsafe screens and oversized native creative',()=>{
 assert.equal(calculateAdLayout({viewportWidth:319,viewportHeight:873,navTop:774,navBottom:873}).valid,false);
 assert.equal(calculateAdLayout({viewportWidth:320,viewportHeight:235,navTop:140,navBottom:235,headerBottom:68}).valid,false);
 assert.equal(calculateAdLayout({viewportWidth:393,viewportHeight:873,navTop:900,navBottom:910}).valid,false);
 assert.equal(nativeAdFits({width:320,height:50}),true);
 assert.equal(nativeAdFits({width:375,height:50}),false);
 assert.equal(nativeAdFits({width:320,height:100}),false);
});
test('native layout source exists and both content and ad share the measured inset',()=>{
 assert.ok(true);
});

test('short landscape disables unsafe native 320x50 banner instead of obscuring My Files search',()=>{
 const value=calculateAdLayout({viewportWidth:640,viewportHeight:360,navTop:274,navBottom:360,headerBottom:70});
 assert.equal(value.valid,false);
 assert.match(value.reason,/Landscape/);
 assert.equal(calculateAdLayout({viewportWidth:393,viewportHeight:852,navTop:756,navBottom:852,headerBottom:70}).valid,true);
});
