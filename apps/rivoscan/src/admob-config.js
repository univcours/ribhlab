export const SAMPLE_ADMOB_APP_ID='ca-app-pub-3940256099942544~3347511713';
const DEMO_PUBLISHER='3940256099942544';
const DEMO={rewarded:'ca-app-pub-3940256099942544/5224354917',interstitial:'ca-app-pub-3940256099942544/1033173712',appOpen:'ca-app-pub-3940256099942544/9257395921'};
const APP=/^ca-app-pub-(\d{16})~\d{10}$/;
const UNIT=/^ca-app-pub-(\d{16})\/\d{10}$/;
export function resolveAdMobConfig(env={}){
 const production=String(env.VITE_RIVOSCAN_ADMOB_PRODUCTION||'').toLowerCase()==='true';
 if(!production)return Object.freeze({production:false,testMode:true,androidAppId:SAMPLE_ADMOB_APP_ID,rewarded:DEMO.rewarded,interstitial:DEMO.interstitial,appOpen:DEMO.appOpen,bannerEnabled:false});
 const androidAppId=String(env.VITE_RIVOSCAN_ADMOB_APP_ID||'').trim(),interstitial=String(env.VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID||'').trim(),appOpen=String(env.VITE_RIVOSCAN_ADMOB_APP_OPEN_ID||'').trim();
 const app=androidAppId.match(APP),inter=interstitial.match(UNIT);
 if(!app||!inter||app[1]!==inter[1]||app[1]===DEMO_PUBLISHER)throw Error('Production AdMob requires real RivoScan Android App ID (~) and a matching interstitial ad unit (/); sample and unrelated IDs are refused.');
 if(appOpen){const open=appOpen.match(UNIT);if(!open||open[1]!==app[1])throw Error('App Open AdMob unit must belong to the same publisher.');}
 return Object.freeze({production:true,testMode:false,androidAppId,interstitial,appOpen:appOpen||null,rewarded:null,bannerEnabled:false});
}
