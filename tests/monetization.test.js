import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CONFIG,productionAdsConfigured,isPremiumFeature,shouldShowInterstitial,
 FULLSCREEN_COOLDOWN_MS,MIN_BACKGROUND_MS,registerLaunch,launchEligible,shouldCountWarmSession,FULLSCREEN_START_LAUNCH,isPremiumBreakDue} from '../src/monetization.js';
test('test-mode banner uses official 320x50 test unit; production requires real Banner ID',()=>{
 assert.equal(AD_CONFIG.bannerEnabled,true);assert.match(AD_CONFIG.banner,/^ca-app-pub-3940256099942544\/\d+$/);
 assert.equal(AD_CONFIG.testMode,true);assert.equal('rewarded' in AD_CONFIG,false);
 for(const id of ['interstitial','banner'])
  assert.match(AD_CONFIG[id],/^ca-app-pub-3940256099942544\/\d+$/);
});
test('basic scanning, reading and existing files never need reward ads',()=>{
 for(const name of ['scan','images','importFiles','shareFiles','merge','library','idcard'])
  assert.equal(isPremiumFeature(name),false);
 for(const name of ['bookScan','documentFlatten','formulaOcr','toExcel','toWord','ocr','aiChat'])
  assert.equal(isPremiumFeature(name),true);
});
test('PRO tools use normal interstitial breaks without reward timers',()=>{
 assert.equal('rewarded' in AD_CONFIG,false);
 assert.equal('rewardedInterstitial' in AD_CONFIG,false);
});
test('interstitial requires consent, saved work, natural break, cooldown, session cap',()=>{
 const state={native:true,consent:true,ready:true,startedAt:1000,
  now:900000,lastShownAt:0,savedCount:2,shownCount:0,premiumUntil:0,launchCount:3};
 assert.equal(shouldShowInterstitial(state),true);
 for(const override of [{native:false},{consent:false},{ready:false},{savedCount:0},
  {launchCount:0},{shownCount:8},{premiumUntil:1000000},{now:30000},{lastShownAt:900000-FULLSCREEN_COOLDOWN_MS+1}])
  assert.equal(shouldShowInterstitial({...state,...override}),false);
});
test('Back ads only after completed work or two tool-to-Home transitions, never app-exit or overlays',()=>{
 const base={native:true,consent:true,ready:true,startedAt:1000,now:900000,
  lastShownAt:0,savedCount:0,backTransitions:1,shownCount:0,premiumUntil:0,trigger:'back',launchCount:3};
 assert.equal(shouldShowInterstitial(base),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2}),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1}),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1,trigger:'regular'}),true);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,shownCount:8}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,premiumUntil:1000000}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,now:29000}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,lastShownAt:899000}),false);
});
test('production cannot use Google test IDs or mismatched publishers',()=>{
 const real={androidAppId:'ca-app-pub-1234567890123456~1234567890',interstitial:'ca-app-pub-1234567890123456/1234567890',banner:'ca-app-pub-1234567890123456/1234567890'};
 assert.equal(productionAdsConfigured(),false);
 assert.equal(productionAdsConfigured(real),true);
 assert.equal(productionAdsConfigured({...real,banner:''}),true); // missing Banner never blocks Interstitial/App Open
 assert.equal(productionAdsConfigured({...real,banner:'ca-app-pub-3940256099942544/6300978111'}),false);
 assert.equal(productionAdsConfigured({...real,interstitial:'ca-app-pub-3940256099942544/1033173712'}),false);
 
 assert.equal(productionAdsConfigured({...real,androidAppId:'ca-app-pub-3940256099942544~3347511713'}),false);
});

test('first launch remains ad-free until real work is complete; later launches require the same safe break',()=>{
 const storage=new Map();
 const facade={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)};
 for(let i=1;i<=6;i++){
  assert.equal(registerLaunch(facade),i);
  assert.equal(launchEligible(i),i>=FULLSCREEN_START_LAUNCH);
 }
 assert.equal(launchEligible(0),false);
 assert.equal(registerLaunch({getItem:()=>{throw Error('private storage')},setItem(){}}),0);
});
test('App Open is entirely disabled; startup only initializes inventory',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/AdMob\.(?:showAppOpen|loadAppOpen|isAppOpenLoaded)/);
 assert.doesNotMatch(code,/AppOpenAdPluginEvents|shouldShowAppOpen/);
 assert.match(code,/export async function startAdsAtLaunch/);
 assert.match(code,/await initializeAds\(\)/);
 assert.match(main,/void startAdsAtLaunch\(\)/);
 assert.doesNotMatch(main,/atNaturalNavigation\(\{[^}]*trigger:'exit'/);
});
test('native banner stays hidden while any full-screen ad is active',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(source,/function bannerObstructed\(\)\{[\s\S]*?return false;/);
 assert.match(source,/pauseBannerForFullscreen\(\)/);
 assert.match(source,/restoreBannerAfterFullscreen\(\)/);
 assert.match(source,/BannerAdPluginEvents.AdImpression/);
 assert.match(source,/InterstitialAdPluginEvents.AdImpression/);
});

test('returning to an app kept alive counts as a new usage after a real background break',()=>{
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS}),true);
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS-1}),false);
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS,working:true}),false);
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS,fullScreenAd:true}),false);
});

test('Native ad no-fill conditions retry with bounded 1/2/4/8 minute backoff',async()=>{
 const fs=await import('node:fs');
 const code=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(code,/const retryCounts=\{banner:0,interstitial:0\}/);
 assert.match(code,/if\(retryCounts\[type\]>=4\)return/);
 assert.match(code,/\[60000,120000,240000,480000\]/);
 assert.match(code,/scheduleAdRetry\('banner'\)/);
 assert.match(code,/scheduleAdRetry\('interstitial'\)/);
});


test('AdMob recovers NO_FILL inventory after a background/foreground cycle without showing startup ads',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(code,/function installAdVisibilityRecovery\(\)/);
 assert.match(code,/document\.addEventListener\('visibilitychange'/);
 assert.match(code,/document\.visibilityState!=='visible'/);
 assert.match(code,/installAdVisibilityRecovery\(\);/);
 assert.match(code,/scheduleBannerRelayout\(\)/);
 assert.match(code,/if\(!retryTimers\.interstitial&&!state\.interstitialReady&&!state\.busy\)/);
 assert.doesNotMatch(code,/AdMob\.(?:showAppOpen|loadAppOpen)/);
});

test('PRO navigation break cadence remains 1, 4, 7, 10 (without bonus ads)',()=>{
 for(let n=1;n<=16;n++)assert.equal(isPremiumBreakDue(n),n%3===1);
 assert.equal(isPremiumBreakDue(0),false);
 assert.equal(isPremiumBreakDue(-2),false);
 assert.equal(isPremiumBreakDue(2.5),false);
});
test('PRO exit uses the regular Interstitial, never a rewarded popup',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(source,/export function atPremiumExit\(\)/);
 assert.match(source,/void atNaturalNavigation\(\{trigger:'regular'\}\)/);
 assert.match(source,/AdMob\.showInterstitial/);
 assert.doesNotMatch(source,/(?:prepareReward|showReward|RewardAdPluginEvents|RewardInterstitialAdPluginEvents|rivo-reward-overlay|PRO bonus)/);
});
