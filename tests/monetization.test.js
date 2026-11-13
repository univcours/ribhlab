import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CONFIG,productionAdsConfigured,isPremiumFeature,remainingPremiumMs,shouldShowInterstitial,shouldShowAppOpen,
 FULLSCREEN_COOLDOWN_MS,MIN_BACKGROUND_MS,APP_OPEN_COOLDOWN_MS,registerLaunch,launchEligible,shouldCountWarmSession,FULLSCREEN_START_LAUNCH} from '../src/monetization.js';
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
  now:900000,lastShownAt:0,savedCount:2,shownCount:0,premiumUntil:0,launchCount:5};
 assert.equal(shouldShowInterstitial(state),true);
 for(const override of [{native:false},{consent:false},{ready:false},{savedCount:1},
  {launchCount:4},{shownCount:5},{premiumUntil:1000000},{now:80000},{lastShownAt:900000-FULLSCREEN_COOLDOWN_MS+1}])
  assert.equal(shouldShowInterstitial({...state,...override}),false);
});
test('Back ads only after completed work or two tool-to-Home transitions, never app-exit or overlays',()=>{
 const base={native:true,consent:true,ready:true,startedAt:1000,now:900000,
  lastShownAt:0,savedCount:0,backTransitions:1,shownCount:0,premiumUntil:0,trigger:'back',launchCount:5};
 assert.equal(shouldShowInterstitial(base),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2}),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1}),true);
 assert.equal(shouldShowInterstitial({...base,savedCount:1,trigger:'regular'}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,shownCount:5}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,premiumUntil:1000000}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,now:80000}),false);
 assert.equal(shouldShowInterstitial({...base,backTransitions:2,lastShownAt:899000}),false);
});
test('app open only on foreground return after >=60 seconds background and 10-minute cooldown',()=>{
 const now=3600000;
 const base={native:true,consent:true,ready:true,backgroundMs:MIN_BACKGROUND_MS,
  now,lastFullscreenAt:now-APP_OPEN_COOLDOWN_MS,premiumUntil:0,working:false,launchCount:5};
 assert.equal(shouldShowAppOpen(base),true);
 for(const change of [{backgroundMs:0},{launchCount:4},{working:true},{consent:false},{native:false},
   {ready:false},{premiumUntil:now+1},{lastFullscreenAt:now-APP_OPEN_COOLDOWN_MS+1}])
  assert.equal(shouldShowAppOpen({...base,...change}),false);
});

test('production cannot use Google test IDs or mismatched publishers',()=>{
 const real={androidAppId:'ca-app-pub-1234567890123456~1234567890',interstitial:'ca-app-pub-1234567890123456/1234567890',appOpen:'',banner:'ca-app-pub-1234567890123456/1234567890'};
 assert.equal(productionAdsConfigured(),false);
 assert.equal(productionAdsConfigured(real),true);
 assert.equal(productionAdsConfigured({...real,banner:''}),true); // missing Banner never blocks Interstitial/App Open
 assert.equal(productionAdsConfigured({...real,banner:'ca-app-pub-3940256099942544/6300978111'}),false);
 assert.equal(productionAdsConfigured({...real,interstitial:'ca-app-pub-3940256099942544/1033173712'}),false);
 assert.equal(productionAdsConfigured({...real,appOpen:'ca-app-pub-3940256099942544/9257395921'}),false);
 assert.equal(productionAdsConfigured({...real,androidAppId:'ca-app-pub-3940256099942544~3347511713'}),false);
});

test('first 4 launches are free from full-screen ads; fifth and later eligible',()=>{
 const storage=new Map();
 const facade={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)};
 for(let i=1;i<=6;i++){
  assert.equal(registerLaunch(facade),i);
  assert.equal(launchEligible(i),i>=FULLSCREEN_START_LAUNCH);
 }
 assert.equal(launchEligible(0),false);
 assert.equal(registerLaunch({getItem:()=>{throw Error('private storage')},setItem(){}}),0);
});
test('cold-start app open requires loading screen and first 5 launches',()=>{
 const base={native:true,consent:true,ready:true,launchCount:5,source:'cold',
  loadingScreen:true,backgroundMs:0,now:10000000,lastFullscreenAt:0,premiumUntil:0,working:false};
 assert.equal(shouldShowAppOpen(base),true);
 assert.equal(shouldShowAppOpen({...base,launchCount:4}),false);
 assert.equal(shouldShowAppOpen({...base,loadingScreen:false}),false);
 assert.equal(shouldShowAppOpen({...base,source:'resume'}),false);
});
test('RivoScan cold start uses a bounded loading gate and keeps interstitial off app exit',async()=>{
 const fs=await import('node:fs');
 const code=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(code,/setTimeout\(reveal,2800\)/);
 assert.match(code,/if\(!gateOpen\|\|!state.appOpenReady/);
 assert.match(code,/pauseBannerForFullscreen/);
 assert.match(main,/void startAdsAtLaunch\(\)/);
 assert.doesNotMatch(main,/atNaturalNavigation\(\{[^}]*trigger:'exit'/);
});

test('native banner stays hidden while any full-screen ad is active',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(source,/return state\.busy\|\|\(typeof document/);
 assert.match(source,/pauseBannerForFullscreen\(\)/);
 assert.match(source,/restoreBannerAfterFullscreen\(\)/);
 assert.match(source,/BannerAdPluginEvents.AdImpression/);
 assert.match(source,/InterstitialAdPluginEvents.AdImpression/);
 assert.match(source,/AppOpenAdPluginEvents.AdImpression/);
});

test('returning to an app kept alive counts as a new usage after a real background break',()=>{
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS}),true);
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS-1}),false);
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS,working:true}),false);
 assert.equal(shouldCountWarmSession({backgroundMs:MIN_BACKGROUND_MS,fullScreenAd:true}),false);
});

test('Native ad no-fill conditions retry with bounded 1/2/4 minute backoff',async()=>{
 const fs=await import('node:fs');
 const code=fs.readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
 assert.match(code,/const retryCounts=\{banner:0,interstitial:0,appOpen:0\}/);
 assert.match(code,/if\(retryCounts\[type\]>=3\)return/);
 assert.match(code,/\[60000,120000,240000\]/);
 assert.match(code,/scheduleAdRetry\('banner'\)/);
 assert.match(code,/scheduleAdRetry\('interstitial'\)/);
 assert.match(code,/scheduleAdRetry\('appOpen'\)/);
});
