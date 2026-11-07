import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProductionAds} from '../src/admob-production-ids.js';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Real ad IDs contain no rewarded unit, and debug only requests safe demo ads',()=>{
 const ads=get('src/monetization.js'),units=get('src/admob-production-ids.js');
 const config=buildProductionAds();
 assert.deepEqual(Object.keys(config).sort(),['appId','appOpen','configured','interstitial']);
 assert.ok(!units.includes('/4148993879'));
 assert.ok(!ads.includes('prepareRewarded')&&!ads.includes('showRewarded'));
 assert.ok(!ads.includes('rewarded:'));
 assert.ok(ads.includes('isTesting:AD_CONFIG.testMode'));
 assert.ok(ads.includes("productionAds?{}:{initializeForTesting:true}"));
 assert.ok(ads.includes("const demoAppOpen='ca-app-pub-3940256099942544/9257395921'"));
});
test('Release workflow builds real full-screen units and excludes rewarded',()=>{
 const workflow=get('../.github/workflows/rivoscan-play-aab.yml');
 assert.ok(workflow.includes("VITE_RIVOSCAN_ADMOB_PRODUCTION:"));
 assert.ok(workflow.includes("! grep -RqF 'ca-app-pub-7945572016731367/4148993879'"));
 assert.ok(workflow.includes("RIVOSCAN_ADMOB_APP_ID:"));
});
