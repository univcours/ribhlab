import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAdMobConfig,SAMPLE_ADMOB_APP_ID} from '../src/admob-config.js';
const live={
 VITE_RIVOSCAN_ADMOB_PRODUCTION:'true',
 VITE_RIVOSCAN_ADMOB_APP_ID:'ca-app-pub-1234567890123456~1111111111',
 VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:'ca-app-pub-1234567890123456/2222222222',
 VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:'ca-app-pub-1234567890123456/3333333333'
};
test('Debug uses demo IDs with no banner',()=>{
 const config=resolveAdMobConfig({});
 assert.equal(config.androidAppId,SAMPLE_ADMOB_APP_ID);
 assert.equal(config.testMode,true);
 assert.equal(config.bannerEnabled,false);
});
test('Live AdMob disables test traffic only for valid matching publisher',()=>{
 const config=resolveAdMobConfig(live);
 assert.equal(config.testMode,false);
 assert.equal(config.production,true);
 assert.equal(config.interstitial,live.VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID);
 assert.equal(config.rewarded,null);
 assert.equal(config.bannerEnabled,false);
});
test('Missing, sample or foreign real AdMob ID prevents live build',()=>{
 for(const env of [
  {VITE_RIVOSCAN_ADMOB_PRODUCTION:'true'},
  {...live,VITE_RIVOSCAN_ADMOB_APP_ID:SAMPLE_ADMOB_APP_ID},
  {...live,VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:'ca-app-pub-3940256099942544/1033173712'},
  {...live,VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:'ca-app-pub-2222222222222222/3333333333'},
  {...live,VITE_RIVOSCAN_ADMOB_APP_ID:'ca-app-pub-1234567890123456/1111111111'},
  {...live,VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:'ca-app-pub-2222222222222222/3333333333'}
 ])assert.throws(()=>resolveAdMobConfig(env),/AdMob|unit/);
});
test('Optional App Open is disabled instead of using a demo in live mode',()=>{
 const config=resolveAdMobConfig({...live,VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:''});
 assert.equal(config.appOpen,null);
 assert.equal(config.testMode,false);
});
