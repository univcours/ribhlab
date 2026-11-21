import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FULLSCREEN_COOLDOWN_MS,MIN_INTERSTITIAL_SESSION_MS,shouldShowInterstitial} from '../src/monetization.js';
const code=readFileSync(new URL('../src/monetization.js',import.meta.url),'utf8');
test('ordinary navigation break shows a preloaded ad after 30-second warm-up',()=>{
 const base={native:true,consent:true,ready:true,startedAt:1000,now:31000,shownCount:100,lastShownAt:0,trigger:'regular',premiumUntil:0};
 assert.equal(MIN_INTERSTITIAL_SESSION_MS,30000);
 assert.equal(FULLSCREEN_COOLDOWN_MS,60000);
 assert.equal(shouldShowInterstitial(base),true);
 assert.equal(shouldShowInterstitial({...base,trigger:'back'}),true);
 assert.equal(shouldShowInterstitial({...base,now:30999}),false);
 assert.equal(shouldShowInterstitial({...base,now:31001,lastShownAt:30999}),false);
 assert.equal(shouldShowInterstitial({...base,now:91000,lastShownAt:31000}),true);
});
test('natural-break interstitials never require saving or multiple launches',()=>{
 assert.doesNotMatch(code,/shownCount\s*<\s*12/);
 assert.match(code,/naturalTransition/);
 assert.match(code,/if\(state\.busy\|\|working\)return false/);
 assert.match(code,/if\(!state\.interstitialReady\)/);
 assert.match(code,/await AdMob\.showInterstitial/);
});
