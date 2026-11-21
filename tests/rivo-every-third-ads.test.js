import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {everyThirdUse,countProFeatureUse,shouldOfferAtOpen,REWARDED_OFFER_EVERY} from '../src/rivo-reward-frequency.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('PRO feature offers after exactly every third use, never on first or second',()=>{
 assert.equal(REWARDED_OFFER_EVERY,3);
 const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,v)=>map.set(key,v)};
 for(let i=1;i<=12;i++){
  const {count,due}=countProFeatureUse(storage);
  assert.equal(count,i);
  assert.equal(due,i%3===0);
 }
 assert.equal(countProFeatureUse({getItem(){throw Error('storage locked')}}).due,false);
 assert.equal(everyThirdUse(NaN),false);
 assert.equal(everyThirdUse(0),false);
 assert.equal(everyThirdUse(3),true);
 assert.equal(shouldOfferAtOpen(2),false);
 assert.equal(shouldOfferAtOpen(3),true);
 assert.equal(shouldOfferAtOpen(6),true);
});

test('Rewarded offer is opt-in, not a Settings button or forced playback',()=>{
 const main=read('src/main.js'),ads=read('src/monetization.js');
 const modal=read('src/rivo-reward-offer.js');
 assert.match(main,/showRewardOffer\(\{language,reason/);
 assert.match(main,/onSkip:/);
 assert.match(main,/onWatch:async/);
 assert.doesNotMatch(main,/data-watch-rewarded/);
 assert.match(modal,/watch\.addEventListener\('click'/);
 assert.match(modal,/skip\.addEventListener\('click'/);
 assert.match(ads,/countProFeatureUse/);
 assert.match(ads,/queueRewardOffer\('pro'\)/);
 assert.match(ads,/return true; \/\/ Every feature stays usable/);
});

test('App Open is attempted on third cold startup only while loading UI exists',()=>{
 const main=read('src/main.js'),ads=read('src/monetization.js'),html=read('index.html');
 assert.match(html,/id="rivo-boot-screen"/);
 assert.match(main,/startAdsAtLaunch\(\{isLoading:bootVisible\}\)/);
 assert.match(main,/Promise\.race\(\[attempt,new Promise\(resolve=>setTimeout\(resolve,1500\)\)\]\)/);
 assert.match(main,/render\(\);startupScreen\?\.remove\(\)/);
 assert.match(ads,/shouldOfferAtOpen\(state\.launchCount\)/);
 assert.match(ads,/if\(!isLoading\(\)\)return false/);
 assert.match(ads,/AdMob\.loadAppOpen/);
 assert.match(ads,/AdMob\.isAppOpenLoaded/);
 assert.match(ads,/AdMob\.showAppOpen/);
});
