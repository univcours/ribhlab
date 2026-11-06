import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProductionAds} from '../scripts/verify-admob-production.mjs';
import {buildProductionAds,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID} from '../src/admob-production-ids.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app='ca-app-pub-7945572016731367~9876543210';
test('Production units exactly match AdMob screenshot; never reuse other apps or samples',()=>{
 assert.equal(RIVOSCAN_INTERSTITIAL_ID,'ca-app-pub-7945572016731367/5608742752');
 assert.equal(RIVOSCAN_APP_OPEN_ID,'ca-app-pub-7945572016731367/6270875707');
 assert.deepEqual(validateProductionAds(app,{interstitial:RIVOSCAN_INTERSTITIAL_ID,appOpen:RIVOSCAN_APP_OPEN_ID}),[]);
 assert.deepEqual(validateProductionAds('',{}),['RIVOSCAN_ADMOB_APP_ID']);
 assert.ok(validateProductionAds('ca-app-pub-7945572016731367/5608742752',{}).length);
 assert.ok(validateProductionAds('ca-app-pub-7945572016731367~1688423435',{}).length===0,
  'An ID of identical publisher format cannot by itself prove RivoScan ownership: user must supply actual RivoScan app ID');
 assert.ok(validateProductionAds('ca-app-pub-3940256099942544~3347511713',{}).length);
 assert.ok(validateProductionAds(app,{rewarded:'ca-app-pub-9999999999999999/1234567890'}).length);
 assert.ok(validateProductionAds(app,{interstitial:'ca-app-pub-7945572016731367/0000000000'}).length);
});
test('Rewarded not yet supplied: two real ad units can be configured, gated features stay free',()=>{
 const config=buildProductionAds({appId:app});
 assert.equal(config.configured,true);
 assert.equal(config.rewarded,'');
 assert.equal(config.rewardedAvailable,false);
 assert.equal(config.interstitial,RIVOSCAN_INTERSTITIAL_ID);
 assert.equal(config.appOpen,RIVOSCAN_APP_OPEN_ID);
 const complete=buildProductionAds({appId:app,rewarded:'ca-app-pub-7945572016731367/1234567890'});
 assert.equal(complete.rewardedAvailable,true);
});
test('Production and debug modes stay isolated and Android Manifest needs actual App ID',()=>{
 const brand=file('apply-rivoscan-branding.ps1'),ads=file('src/monetization.js');
 assert.ok(brand.includes('RIVOSCAN_ADMOB_PRODUCTION'));
 assert.ok(brand.includes('RIVOSCAN_ADMOB_APP_ID'));
 assert.ok(ads.includes('VITE_RIVOSCAN_ADMOB_PRODUCTION'));
 assert.ok(ads.includes('RivoScan production AdMob App ID missing or invalid'));
 assert.ok(ads.includes('bannerEnabled:false'));
 assert.ok(ads.includes("Boolean(AD_CONFIG.rewarded)"));
});
