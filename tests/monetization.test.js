import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CONFIG,productionAdsConfigured,isPremiumFeature,remainingPremiumMs,shouldShowInterstitial,shouldShowAppOpen,
 FULLSCREEN_COOLDOWN_MS,MIN_BACKGROUND_MS,APP_OPEN_COOLDOWN_MS} from '../src/monetization.js';
test('test-mode banner uses official 320x50 test unit; production requires real Banner ID',()=>{
 assert.equal(AD_CONFIG.bannerEnabled,true);assert.match(AD_CONFIG.banner,/^ca-app-pub-3940256099942544\/\d+$/);
 assert.equal(AD_CONFIG.testMode,true);
 for(const id of ['rewarded','interstitial','appOpen','banner'])
  assert.match(AD_CONFIG[id],/^ca-app-pub-3940256099942544\/\d+$/);
});
test('basic scanning, reading and existing files never need reward ads',()=>{
 for(const name of ['scan','images','importFiles','shareFiles','merge','library','idcard'])
  assert.equal(isPremiumFeature(name),false);
 for(const name of ['bookScan','documentFlatten','formulaOcr','toExcel','toWord','ocr','aiChat'])
  assert.equal(isPremiumFeature(name),true);
});
test('reward unlock is limited to 10 minutes',()=>{
 assert.equal(remainingPremiumMs(600000,0),600000);
 assert.equal(remainingPremiumMs(600000,600001),0);
});
test('interstitial requires consent, saved work, natural break, cooldown, session cap',()=>{
 const state={native:true,consent:true,ready:true,startedAt:1000,
  now:900000,lastShownAt:0,savedCount:2,shownCount:0,premiumUntil:0};
 assert.equal(shouldShowInterstitial(state),true);
 for(const override of [{native:false},{consent:false},{ready:false},{savedCount:1},
  {shownCount:3},{premiumUntil:1000000},{now:100000},{lastShownAt:900000-FULLSCREEN_COOLDOWN_MS+1}])
  assert.equal(shouldShowInterstitial({...state,...override}),false);
});
test('Back ads only after completed work or two tool-to-Home transitions, never app-exit or overlays',()=>{
 const base={native:true,consent:true,ready:true,startedAt:1000,now:900000,
  lastShownAt:0,savedCount:0,backTransitions:1,shownCount:0,premiumUntil:0,trigger:'back'};
 assert.equal(shouldShowInterstitial(base),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2}),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1}),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1,trigger:'regular'}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,shownCount:3}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,premiumUntil:1000000}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,now:100000}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,lastShownAt:899000}),false);
});
test('app open only on foreground return after >=60 seconds background and 20-minute cooldown',()=>{
 const now=3600000;
 const base={native:true,consent:true,ready:true,backgroundMs:MIN_BACKGROUND_MS,
  now,lastFullscreenAt:now-APP_OPEN_COOLDOWN_MS,premiumUntil:0,working:false};
 assert.equal(shouldShowAppOpen(base),true);
 for(const change of [{backgroundMs:0},{working:true},{consent:false},{native:false},
   {ready:false},{premiumUntil:now+1},{lastFullscreenAt:now-APP_OPEN_COOLDOWN_MS+1}])
  assert.equal(shouldShowAppOpen({...base,...change}),false);
});

test('production cannot use Google test IDs or mismatched publishers',()=>{
 const real={androidAppId:'ca-app-pub-1234567890123456~1234567890',interstitial:'ca-app-pub-1234567890123456/1234567890',appOpen:'',banner:'ca-app-pub-1234567890123456/1234567890'};
 assert.equal(productionAdsConfigured(),false);
 assert.equal(productionAdsConfigured(real),true);
 assert.equal(productionAdsConfigured({...real,banner:''}),false);
 assert.equal(productionAdsConfigured({...real,banner:'ca-app-pub-3940256099942544/6300978111'}),false);
 assert.equal(productionAdsConfigured({...real,interstitial:'ca-app-pub-3940256099942544/1033173712'}),false);
 assert.equal(productionAdsConfigured({...real,appOpen:'ca-app-pub-3940256099942544/9257395921'}),false);
 assert.equal(productionAdsConfigured({...real,androidAppId:'ca-app-pub-3940256099942544~3347511713'}),false);
});
