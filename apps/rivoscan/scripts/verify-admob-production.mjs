// Real ad units are verified for RivoScan alone. A production App ID is
// mandatory. Rewarded is optional until the publisher creates that ad unit:
// premium-gated features then remain FREE rather than unavailable.
import {buildProductionAds,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID}
 from '../src/admob-production-ids.js';
const live=process.env.RIVOSCAN_ADMOB_PRODUCTION==='true';
const app=String(process.env.RIVOSCAN_ADMOB_APP_ID||'').trim();
const reward=String(process.env.VITE_RIVOSCAN_ADMOB_REWARDED_ID||'').trim();
export function validateProductionAds(appId,units={}){
 const errors=[];
 const results=buildProductionAds({appId,rewarded:units.rewarded});
 if(!results.appId)errors.push('RIVOSCAN_ADMOB_APP_ID');
 if(!results.configured&&results.appId)errors.push('RIVOSCAN_ADMOB_REWARDED_ID (invalid format/publisher)');
 if(units.interstitial&&units.interstitial!==RIVOSCAN_INTERSTITIAL_ID)
  errors.push('Interstitial ID does not match confirmed RivoScan unit');
 if(units.appOpen&&units.appOpen!==RIVOSCAN_APP_OPEN_ID)
  errors.push('App Open ID does not match confirmed RivoScan unit');
 return errors;
}
if(process.argv[1]?.endsWith('verify-admob-production.mjs')){
 if(!live){console.log('AdMob: Google sample ads for debug / automatic CI only.');process.exit(0);}
 const invalid=validateProductionAds(app,{rewarded:reward,
  interstitial:process.env.VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID,
  appOpen:process.env.VITE_RIVOSCAN_ADMOB_APP_OPEN_ID});
 if(invalid.length){console.error('RivoScan AdMob production setup incomplete: '+invalid.join('; '));process.exit(1);}
 console.log('RivoScan AdMob: production App ID and confirmed Interstitial/App Open IDs valid.');
 if(!reward)console.log('Rewarded Ad Unit not created: rewarded gating disabled, advanced tools remain freely accessible.');
}
