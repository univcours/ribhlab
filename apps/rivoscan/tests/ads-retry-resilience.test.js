import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canRetryAdLoad,AD_RETRY_DELAY_MS} from '../src/monetization.js';
const source=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');

test('A missing fill or network error can be retried after bounded cooldown',()=>{
 assert.equal(AD_RETRY_DELAY_MS,60000);
 assert.equal(canRetryAdLoad(0,1000),true);
 assert.equal(canRetryAdLoad(1000,60999),false);
 assert.equal(canRetryAdLoad(1000,61000),true);
});
test('Interstitial and App Open retries are event-triggered, never forced mid-task',()=>{
 assert.ok(source.includes('if(!state.interstitialReady){void loadInterstitial();return false;}'));
 assert.ok(source.includes('if(!state.appOpenReady){void loadAppOpen();return false;}'));
 assert.ok(source.includes('if(state.busy||working||backgroundMs<MIN_BACKGROUND_MS)return false'));
 assert.ok(source.includes('if(!state.ready){void initializeAds({retry:true});return false;}'));
 assert.ok(source.includes('state.initializingInterstitial=true'));
 assert.ok(source.includes('state.initializingAppOpen=true'));
});
test('Privacy options recheck consent before making new requests',()=>{
 assert.ok(source.includes('const consent=await AdMob.requestConsentInfo();'));
 assert.ok(source.includes('state.consent=consent.canRequestAds===true'));
 assert.ok(source.includes("status('Ads paused: privacy choice')"));
 assert.ok(source.includes('if(!state.ready||!state.consent||!AD_CONFIG.interstitial'));
 assert.ok(source.includes('if(!state.ready||!state.consent||!AD_CONFIG.appOpen'));
});
