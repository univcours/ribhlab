import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CONFIG,isPremiumFeature,remainingPremiumMs,shouldShowInterstitial,shouldShowAppOpen,
 FULLSCREEN_COOLDOWN_MS,MIN_BACKGROUND_MS,APP_OPEN_COOLDOWN_MS} from '../src/monetization.js';
test('Developer build makes no test or live ad requests',()=>{
 assert.equal(AD_CONFIG.bannerEnabled,false);assert.equal('banner' in AD_CONFIG,false);
 assert.equal(AD_CONFIG.testMode,false);
 assert.equal(AD_CONFIG.configured,false);
 for(const id of ['rewarded','interstitial','appOpen'])assert.equal(AD_CONFIG[id],'');
 assert.equal(AD_CONFIG.androidAppId,'ca-app-pub-7945572016731367~1509328607');
});
test('basic scanning, reading and existing files never need reward ads',()=>{
 for(const name of ['scan','images','importFiles','shareFiles','merge','library','idcard'])
  assert.equal(isPremiumFeature(name),false);
 for(const name of ['bookScan','documentFlatten','formulaOcr','toExcel','toWord','ocr','aiChat'])
  assert.equal(isPremiumFeature(name),false);
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

test('All features remain usable without mandatory rewarded video',async()=>{
 const {requestPremium,isPremiumFeature}=await import('../src/monetization.js');
 for(const id of ['scan','bookScan','documentFlatten','ocr','toExcel','aiChat']){
  assert.equal(isPremiumFeature(id),false);
  assert.equal(await requestPremium(id),true);
 }
});
