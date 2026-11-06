// Real RivoScan ad units confirmed by the publisher's AdMob screenshot,
// 2026-11-06. They are not Google sample IDs. AdMob App ID is distinct and
// must come from RivoScan > App settings; never copy a different app's App ID.
export const RIVOSCAN_ADMOB_PUBLISHER='7945572016731367';
export const RIVOSCAN_INTERSTITIAL_ID='ca-app-pub-7945572016731367/5608742752';
export const RIVOSCAN_APP_OPEN_ID='ca-app-pub-7945572016731367/6270875707';
export function buildProductionAds({appId='',rewarded=''}={}){
 const androidAppId=String(appId||'').trim();
 const rewardId=String(rewarded||'').trim();
 const publisherPrefix='ca-app-pub-'+RIVOSCAN_ADMOB_PUBLISHER;
 const appValid=new RegExp('^'+publisherPrefix+'~[0-9]{10}$').test(androidAppId);
 const rewardValid=!rewardId||new RegExp('^'+publisherPrefix+'/[0-9]{10}$').test(rewardId);
 return {
  configured:appValid&&rewardValid,
  appId:appValid?androidAppId:'',
  rewarded:rewardValid?rewardId:'',
  interstitial:RIVOSCAN_INTERSTITIAL_ID,
  appOpen:RIVOSCAN_APP_OPEN_ID,
  rewardedAvailable:appValid&&rewardValid&&!!rewardId
 };
}
