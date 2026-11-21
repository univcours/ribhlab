import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CONFIG,productionAdsConfigured,isPremiumFeature,remainingPremiumMs,shouldShowInterstitial,
 FULLSCREEN_COOLDOWN_MS,MIN_INTERSTITIAL_SESSION_MS,MIN_BACKGROUND_MS,registerLaunch,launchEligible,shouldCountWarmSession,FULLSCREEN_START_LAUNCH} from '../src/monetization.js';
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
test('legacy premium timer does not enable rewarded ads',()=>{
 assert.equal(remainingPremiumMs(600000,0),600000);
 assert.equal(remainingPremiumMs(600000,600001),0);
});
test('ordinary interstitial conditions do not require a saved file or multiple launches',()=>{
 const state={native:true,consent:true,ready:true,startedAt:1000,
  now:32000,lastShownAt:0,savedCount:0,shownCount:0,premiumUntil:0,launchCount:1};
 assert.equal(shouldShowInterstitial(state),true);
 assert.equal(shouldShowInterstitial({...state,launchCount:0}),true);
 assert.equal(shouldShowInterstitial({...state,trigger:'back'}),true);
 for(const override of [{native:false},{consent:false},{ready:false},
  {premiumUntil:1000000},{now:1000+MIN_INTERSTITIAL_SESSION_MS-1},
  {lastShownAt:32000-FULLSCREEN_COOLDOWN_MS+1},{trigger:'exit'}])
  assert.equal(shouldShowInterstitial({...state,...override}),false);
});
test('interstitials are limited to natural breaks with a one-minute cooldown',()=>{
 const base={native:true,consent:true,ready:true,startedAt:1000,now:900000,
  lastShownAt:0,savedCount:0,shownCount:0,premiumUntil:0,trigger:'regular'};
 assert.equal(shouldShowInterstitial(base),true);
 assert.equal(shouldShowInterstitial({...base,trigger:'back'}),true);
 assert.equal(shouldShowInterstitial({...base,trigger:'exit'}),false);
 assert.equal(shouldShowInterstitial({...base,shownCount:999}),true);
 assert.equal(MIN_INTERSTITIAL_SESSION_MS,10000);
 assert.equal(FULLSCREEN_COOLDOWN_MS,45000);
 assert.equal(shouldShowInterstitial({...base,lastShownAt:900000- FULLSCREEN_COOLDOWN_MS+1}),false);
 assert.equal(shouldShowInterstitial({...base,lastShownAt:900000-FULLSCREEN_COOLDOWN_MS}),true);
});
test('interstitial loading is serialized and retried at a later navigation when not ready',async()=>{
 const fs=await import('node:fs');
 const code=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(code,/interstitialLoading:false/);
 assert.match(code,/state\.interstitialLoading/);
 assert.match(code,/state\.interstitialLoading\|\|state\.busy/);
 assert.match(code,/if\(!state\.interstitialReady\)\{/);
 assert.match(code,/void loadInterstitial\(\)/);
 assert.match(code,/await trackNativeAdEvents\(\)/);
});

test('production cannot use Google test IDs or mismatched publishers',()=>{
 const real={androidAppId:'ca-app-pub-1234567890123456~1234567890',interstitial:'ca-app-pub-1234567890123456/1234567890',appOpen:'',banner:'ca-app-pub-1234567890123456/1234567890'};
 assert.equal(productionAdsConfigured(),false);
 assert.equal(productionAdsConfigured(real),true);
 assert.equal(productionAdsConfigured({...real,banner:''}),true); // missing Banner never blocks Interstitial/App Open
 assert.equal(productionAdsConfigured({...real,banner:'ca-app-pub-3940256099942544/6300978111'}),false);
 assert.equal(productionAdsConfigured({...real,interstitial:'ca-app-pub-3940256099942544/1033173712'}),false);
 
 assert.equal(productionAdsConfigured({...real,androidAppId:'ca-app-pub-3940256099942544~3347511713'}),false);
});

test('the first launch is eligible; launch count is no longer a fullscreen-ad gate',()=>{
 const storage=new Map();
 const facade={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)};
 for(let i=1;i<=6;i++){
  assert.equal(registerLaunch(facade),i);
  assert.equal(launchEligible(i),true);
 }
 assert.equal(launchEligible(0),false);
 assert.equal(FULLSCREEN_START_LAUNCH,1);
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
 assert.match(source,/if\(state\.busy\|\|keyboard\)return true/);
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

test('Native no-fill inventory retries after 30/60/120/240 seconds without hammering AdMob',async()=>{
 const fs=await import('node:fs');
 const code=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(code,/const retryCounts=\{banner:0,interstitial:0\}/);
 assert.match(code,/if\(retryCounts\[type\]>=4\)return/);
 assert.match(code,/\[30000,60000,120000,240000\]/);
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
