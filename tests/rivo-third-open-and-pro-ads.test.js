import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AD_CONFIG,eachThird,registerPremiumUsage,launchEligible,productionAdsConfigured,
 isPremiumFeature} from '../src/monetization.js';
const txt=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('App Open and Pro feature milestones are exactly every three uses',()=>{
 for(let n=1;n<=12;n++){
  assert.equal(eachThird(n),n%3===0);
  assert.equal(launchEligible(n),n%3===0);
 }
 const map=new Map();
 const storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
 for(let n=1;n<=9;n++)assert.equal(registerPremiumUsage(storage),n);
 for(const id of ['bookScan','documentFlatten','formulaOcr','toWord','ocr','aiChat'])
  assert.equal(isPremiumFeature(id),true);
 for(const id of ['scan','library','shareFiles','images'])
  assert.equal(isPremiumFeature(id),false);
});
test('real AdMob App Open ID can show video or image, never during editing or late after splash',()=>{
 const ads=txt('src/monetization.js'),main=txt('src/main.js');
 assert.match(ads,/appOpen:liveAds\?/);
 assert.equal(AD_CONFIG.appOpen,'ca-app-pub-3940256099942544/9257395921');
 const real={androidAppId:'ca-app-pub-1234567890123456~1234567890',
  interstitial:'ca-app-pub-1234567890123456/1234567890',
  banner:'ca-app-pub-1234567890123456/1234567890',
  rewarded:'ca-app-pub-1234567890123456/1234567890',
  appOpen:'ca-app-pub-1234567890123456/1234567890'};
 assert.equal(productionAdsConfigured(real),true);
 assert.equal(productionAdsConfigured({...real,appOpen:'ca-app-pub-3940256099942544/9257395921'}),false);
 assert.match(ads,/await AdMob\.loadAppOpen\(\{adId:AD_CONFIG\.appOpen\}\)/);
 assert.match(ads,/await AdMob\.isAppOpenLoaded\(\{adId:AD_CONFIG\.appOpen\}\)/);
 assert.match(ads,/await AdMob\.showAppOpen\(\{adId:AD_CONFIG\.appOpen\}\)/);
 assert.match(ads,/if\(!loaded\|\|!stillOpening\(\)\)return false/);
 assert.match(main,/setTimeout\(\(\)=>splash\.remove\(\),1700\)/);
 assert.match(main,/startAdsAtLaunch\(\{isLoading:/);
 assert.match(main,/launchEligible\(getPremiumStatus\(\)\.launchCount\)/);
});
test('third premium usage marks a deferred natural-break ad; never interrupts scanning or saving',()=>{
 const ads=txt('src/monetization.js'),main=txt('src/main.js');
 assert.match(ads,/if\(eachThird\(count\)\)state\.pendingProInterstitial=true/);
 assert.match(ads,/if\(state\.busy\|\|working\|\|!state\.pendingProInterstitial\)return false/);
 assert.match(ads,/state\.pendingProInterstitial=false/);
 assert.match(ads,/export async function requestPremium\(id\)/);
 assert.doesNotMatch(main,/data-watch-rewarded/);
 assert.doesNotMatch(main,/rivo-rewarded-choice/);
 assert.match(main,/void startAdsAtLaunch|const startupAdTask=startAdsAtLaunch/);
});
