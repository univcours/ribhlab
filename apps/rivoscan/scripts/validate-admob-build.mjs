import {resolveAdMobConfig} from '../src/admob-config.js';
const config=resolveAdMobConfig(process.env);
if(config.production){
 if(config.testMode||!config.androidAppId||!config.interstitial)throw Error('RivoScan production AdMob misconfigured.');
 console.log('[RivoScan] LIVE AdMob IDs validated (no demo ID or banners).');
}else console.log('[RivoScan] Debug/QA uses demo AdMob IDs only.');
