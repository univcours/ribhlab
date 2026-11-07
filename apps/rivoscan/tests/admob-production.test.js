import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProductionAds} from '../scripts/verify-admob-production.mjs';
import {buildProductionAds,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID,RIVOSCAN_REWARDED_ID,RIVOSCAN_ADMOB_APP_ID} from '../src/admob-production-ids.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app='ca-app-pub-7945572016731367~1509328607';
test('Production units exactly match AdMob screenshot; never reuse other apps or samples',()=>{
 assert.equal(RIVOSCAN_INTERSTITIAL_ID,'ca-app-pub-7945572016731367/5608742752');
 assert.equal(RIVOSCAN_APP_OPEN_ID,'ca-app-pub-7945572016731367/6270875707');
 assert.equal(RIVOSCAN_REWARDED_ID,'ca-app-pub-7945572016731367/4148993879');
 assert.equal(RIVOSCAN_ADMOB_APP_ID,app);
 assert.deepEqual(validateProductionAds(app,{interstitial:RIVOSCAN_INTERSTITIAL_ID,appOpen:RIVOSCAN_APP_OPEN_ID}),[]);
 assert.deepEqual(validateProductionAds('',{}),['RIVOSCAN_ADMOB_APP_ID (must equal verified RivoScan App ID)']);
 assert.deepEqual(buildProductionAds(),buildProductionAds({appId:app}));
 assert.ok(validateProductionAds('ca-app-pub-7945572016731367~9876543210',{}).length,
  'reject unknown same-publisher App IDs');
 assert.ok(validateProductionAds('ca-app-pub-7945572016731367/5608742752',{}).length);
 // The actual RivoScan app ID must come from that app's own AdMob settings.
 assert.ok(validateProductionAds('ca-app-pub-3940256099942544~3347511713',{}).length);
 assert.ok(validateProductionAds(app,{rewarded:'ca-app-pub-9999999999999999/1234567890'}).length);
 assert.ok(validateProductionAds(app,{interstitial:'ca-app-pub-7945572016731367/0000000000'}).length);
});
test('All three real RivoScan ad units are configured when the actual App ID is supplied',()=>{
 const config=buildProductionAds({appId:app});
 assert.equal(config.configured,true);
 assert.equal(config.rewarded,RIVOSCAN_REWARDED_ID);
 assert.equal(config.rewardedAvailable,true);
 assert.equal(config.interstitial,RIVOSCAN_INTERSTITIAL_ID);
 assert.equal(config.appOpen,RIVOSCAN_APP_OPEN_ID);
 assert.equal(config.rewarded,RIVOSCAN_REWARDED_ID);
});
test('Production and debug modes stay isolated and Android Manifest needs actual App ID',()=>{
 const brand=file('apply-rivoscan-branding.ps1'),ads=file('src/monetization.js');
 assert.ok(brand.includes('RIVOSCAN_ADMOB_PRODUCTION'));
 assert.ok(brand.includes('RIVOSCAN_ADMOB_APP_ID'));
 assert.ok(brand.includes(app),'Android manifest must use real RivoScan App ID');
 assert.ok(ads.includes('VITE_RIVOSCAN_ADMOB_PRODUCTION'));
 assert.ok(ads.includes('RivoScan production AdMob App ID missing or invalid'));
 assert.ok(ads.includes('bannerEnabled:false'));
 assert.ok(ads.includes('requestPremium(){return true;}'),'All features are free and Ads are contextual');
 assert.ok(ads.includes('testMode:false'));
 assert.ok(!ads.includes('ca-app-pub-3940256099942544'),'no Google demo ad units in the bundle');
 assert.ok(ads.includes("appId:adEnv.VITE_RIVOSCAN_ADMOB_APP_ID||RIVOSCAN_ADMOB_APP_ID"));
});
