// Fail-closed release gate. Real AdMob App ID and all ad-unit IDs are required.
// IDs are public routing identifiers, but GitHub Secrets prevents accidental
// use during normal test builds. Never print full identifiers in logs.
const live=process.env.RIVOSCAN_ADMOB_PRODUCTION==='true';
const app=String(process.env.RIVOSCAN_ADMOB_APP_ID||'').trim();
const fields={
 rewarded:process.env.VITE_RIVOSCAN_ADMOB_REWARDED_ID,
 interstitial:process.env.VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID,
 appOpen:process.env.VITE_RIVOSCAN_ADMOB_APP_OPEN_ID
};
const testPublisher='3940256099942544';
const pub=(x)=>String(x||'').match(/^ca-app-pub-(\d{16})[~/]/)?.[1]||'';
export function validateProductionAds(appId,units){
 const missing=[];
 if(!/^ca-app-pub-\d{16}~\d{10}$/.test(String(appId||''))||pub(appId)===testPublisher)missing.push('RIVOSCAN_ADMOB_APP_ID');
 for(const [key,value] of Object.entries(units)){
  if(!/^ca-app-pub-\d{16}\/\d{10}$/.test(String(value||''))||pub(value)!==pub(appId)||pub(value)===testPublisher)
   missing.push('VITE_RIVOSCAN_ADMOB_'+(key==='appOpen'?'APP_OPEN':key.toUpperCase())+'_ID');
 }
 return missing;
}
if(process.argv[1]?.endsWith('verify-admob-production.mjs')){
 if(!live){console.log('AdMob: demo units only (development / CI).');process.exit(0);}
 const invalid=validateProductionAds(app,fields);
 if(invalid.length){console.error('Production AdMob configuration incomplete: '+invalid.join(', '));process.exit(1);}
 console.log('AdMob: production identifiers validated (actual ad serving subject to AdMob approval).');
}
