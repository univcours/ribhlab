import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProductionAds} from '../scripts/verify-admob-production.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app='ca-app-pub-1234567890123456~9876543210';
const fields={rewarded:'ca-app-pub-1234567890123456/1111111111',
 interstitial:'ca-app-pub-1234567890123456/2222222222',
 appOpen:'ca-app-pub-1234567890123456/3333333333'};
test('Real ads require the actual App ID and all units from same publisher',()=>{
 assert.deepEqual(validateProductionAds(app,fields),[]);
 assert.ok(validateProductionAds('',fields).includes('RIVOSCAN_ADMOB_APP_ID'));
 assert.ok(validateProductionAds(app,{...fields,rewarded:''}).includes('VITE_RIVOSCAN_ADMOB_REWARDED_ID'));
 assert.ok(validateProductionAds(app,{...fields,appOpen:'ca-app-pub-9999999999999999/9999999999'}).includes('VITE_RIVOSCAN_ADMOB_APP_OPEN_ID'));
 assert.ok(validateProductionAds('ca-app-pub-3940256099942544~3347511713',fields).length);
});
test('Production and test ad bundles are explicitly separated',()=>{
 const script=file('apply-rivoscan-branding.ps1'),ads=file('src/monetization.js');
 assert.ok(script.includes("RIVOSCAN_ADMOB_PRODUCTION"));
 assert.ok(script.includes('RIVOSCAN_ADMOB_APP_ID'));
 assert.ok(ads.includes('VITE_RIVOSCAN_ADMOB_PRODUCTION'));
 assert.ok(ads.includes('Production ad units missing or invalid'));
 assert.ok(ads.includes('bannerEnabled:false'));
});
