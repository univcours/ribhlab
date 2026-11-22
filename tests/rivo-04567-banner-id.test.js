import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('0.45.67 restores the original banner ID instead of the 0.45.66 typo',()=>{
 const old=read('.github/workflows/rivoscan-04566-full-polish.yml');
 const flow=read('.github/workflows/rivoscan-04567-complete-ui.yml');
 assert.match(old,/4841819190/,'old release had typo');
 assert.match(flow,/VITE_RIVO_ADMOB_BANNER_ID: ca-app-pub-7945572016731367\/4841809190/);
 assert.doesNotMatch(flow,/4841819190/);
 assert.doesNotMatch(flow,/VITE_RIVO_ADMOB_REWARDED_ID:/);
 assert.match(flow,/VITE_RIVO_ADMOB_INTERSTITIAL_ID:/);
 assert.match(flow,/versionCode='182' versionName='0\.45\.67'/);
 assert.match(flow,/grep -Fi 'e9b3e2779575ba08a91372fc3885eba01dd3e73e'/);
 assert.doesNotMatch(flow,/publish-rivoscan-play-aab/);
});
