// Generate release-only AdMob build variables from the publisher's archived
// verified RivoScan Android app. These identifiers are public, not API secrets.
import {appendFileSync} from 'node:fs';
import {resolveAdMobConfig} from '../src/admob-config.js';
import {RIVOSCAN_ADMOB_APP_ID,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID} from '../src/admob-production-ids.js';
const values={
 VITE_RIVOSCAN_ADMOB_PRODUCTION:'true',
 VITE_RIVOSCAN_ADMOB_APP_ID:RIVOSCAN_ADMOB_APP_ID,
 VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:RIVOSCAN_INTERSTITIAL_ID,
 VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:RIVOSCAN_APP_OPEN_ID
};
const cfg=resolveAdMobConfig(values);
if(!cfg.production||cfg.testMode)throw Error('Refusing a demo AdMob Play release.');
if(!process.env.GITHUB_ENV)throw Error('Missing GitHub Actions environment output file.');
appendFileSync(process.env.GITHUB_ENV,Object.entries(values).map(([name,value])=>name+'='+value+'\n').join(''));
console.log('[RivoScan] Release-only live AdMob app, interstitial and app-open identifiers verified.');
