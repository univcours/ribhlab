import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AD_CONFIG,REWARDED_BREAK_MS,rewardedBreakUntil,productionAdsConfigured,isPremiumFeature} from '../src/monetization.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('AdMob rewarded video is optional, uses official Android demo ID outside production',()=>{
 assert.equal(AD_CONFIG.rewarded,'ca-app-pub-3940256099942544/5224354917');
 assert.equal(REWARDED_BREAK_MS,600000);
 const live={androidAppId:'ca-app-pub-1234567890123456~1234567890',
   banner:'ca-app-pub-1234567890123456/1234567890',
   interstitial:'ca-app-pub-1234567890123456/1234567890',
   rewarded:'ca-app-pub-1234567890123456/1234567890'};
 assert.equal(productionAdsConfigured(live),true);
 assert.equal(productionAdsConfigured({...live,rewarded:'ca-app-pub-3940256099942544/5224354917'}),false);
});
test('only a positive earned native reward grants the 10-minute ad-free break',()=>{
 assert.equal(rewardedBreakUntil({rewardAmount:0,now:10000,previousUntil:0}),0);
 assert.equal(rewardedBreakUntil({rewardAmount:-1,now:10000,previousUntil:0}),0);
 assert.equal(rewardedBreakUntil({rewardAmount:1,now:10000,previousUntil:0}),610000);
 assert.equal(rewardedBreakUntil({rewardAmount:1,now:10000,previousUntil:610000}),1210000);
 const monetization=source('src/monetization.js');
 assert.match(monetization,/const earned=await AdMob\.showRewardVideoAd\(\{adId:AD_CONFIG\.rewarded\}\)/);
 assert.match(monetization,/if\(!\(Number\(earned\?\.amount\)>0\)\)return false/);
 assert.match(monetization,/await pauseBannerForFullscreen\(\)/);
 assert.match(monetization,/state\.busy=false;void restoreBannerAfterFullscreen\(\);void loadRewarded\(\)/);
 assert.match(monetization,/now>=premiumUntil/);
});
test('direct Rewarded video button is removed from Settings without gating document access',()=>{
 const main=source('src/main.js'),monetization=source('src/monetization.js');
 assert.doesNotMatch(main,/data-watch-rewarded/);
 assert.doesNotMatch(main,/settings-section rivo-rewarded-choice/);
 assert.match(main,/rivo-startup-ad-splash/);
 assert.match(main,/data-ad-privacy/);
 assert.match(monetization,/export async function requestPremium\(_id\)\{return true;\}/);
 for(const id of ['scan','images','library','merge','idcard'])assert.equal(isPremiumFeature(id),false);
});
