import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CONFIG,isPremiumFeature,remainingPremiumMs,shouldShowInterstitial} from '../src/monetization.js';
test('all ad IDs are Google development TEST units only',()=>{
 assert.equal(AD_CONFIG.testMode,true);
 for(const name of ['banner','rewarded','interstitial'])assert.match(AD_CONFIG[name],/^ca-app-pub-3940256099942544\/\d+$/);
});
test('premium access is scoped to heavy tools, not essential scanning or saved files',()=>{
 for(const id of ['bookScan','documentFlatten','formulaOcr','toExcel','toWord','ocr','aiChat'])assert.equal(isPremiumFeature(id),true);
 for(const id of ['scan','images','importFiles','shareFiles','merge','library','idcard'])assert.equal(isPremiumFeature(id),false);
});
test('rewarded access expires after precisely 10 minutes',()=>{
 assert.equal(remainingPremiumMs(600000,0),600000);
 assert.equal(remainingPremiumMs(600000,600001),0);
});
test('interstitial only at a natural navigation after 2 finished tasks, min 2 min and 8 min cooldown',()=>{
 const base={native:true,consent:true,startedAt:1000,now:900000,lastShownAt:0,savedCount:2,shownCount:0,premiumUntil:0};
 assert.equal(shouldShowInterstitial(base),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1}),false);
 assert.equal(shouldShowInterstitial({...base,now:100000}),false);
 assert.equal(shouldShowInterstitial({...base,lastShownAt:700000}),false);
 assert.equal(shouldShowInterstitial({...base,shownCount:3}),false);
 assert.equal(shouldShowInterstitial({...base,consent:false}),false);
 assert.equal(shouldShowInterstitial({...base,premiumUntil:1000000}),false);
});
