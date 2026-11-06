// Real RivoScan ad units confirmed by the publisher's AdMob screenshot,
// 2026-11-06. They are not Google sample IDs. AdMob App ID is distinct and
// must come from RivoScan > App settings; never copy a different app's App ID.
export const RIVOSCAN_ADMOB_PUBLISHER='7945572016731367';
export const RIVOSCAN_ADMOB_APP_ID='ca-app-pub-7945572016731367~1509328607';
export const RIVOSCAN_INTERSTITIAL_ID='ca-app-pub-7945572016731367/5608742752';
export const RIVOSCAN_APP_OPEN_ID='ca-app-pub-7945572016731367/6270875707';
export const RIVOSCAN_REWARDED_ID='ca-app-pub-7945572016731367/4148993879';
export function buildProductionAds({appId=RIVOSCAN_ADMOB_APP_ID}={}){
 const androidAppId=String(appId||'').trim();
 const appValid=androidAppId===RIVOSCAN_ADMOB_APP_ID;
 return {
  configured:appValid,
  appId:appValid?androidAppId:'',
  rewarded:RIVOSCAN_REWARDED_ID,
  interstitial:RIVOSCAN_INTERSTITIAL_ID,
  appOpen:RIVOSCAN_APP_OPEN_ID,
  rewardedAvailable:appValid
 };
}
