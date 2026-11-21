/** Rewarded video offer cadence — optional invitations, NEVER auto-playing ads.
 * One opportunity after every third PRO feature entry or genuine app opening. */
export const REWARDED_OFFER_EVERY=3;
export const PRO_FEATURE_USE_KEY='rivo-pro-feature-use-count-v1';

export function everyThirdUse(count){
 return Number.isSafeInteger(count)&&count>0&&count%REWARDED_OFFER_EVERY===0;
}
export function countProFeatureUse(storage=undefined){
 if(!storage)return {count:0,due:false};
 try{
  const previous=Number(storage.getItem(PRO_FEATURE_USE_KEY));
  const safe=Number.isSafeInteger(previous)&&previous>=0&&previous<1_000_000?previous:0;
  const count=safe+1;
  storage.setItem(PRO_FEATURE_USE_KEY,String(count));
  return {count,due:everyThirdUse(count)};
 }catch{return {count:0,due:false}}
}
export function shouldOfferAtOpen(launchCount){
 return everyThirdUse(Number(launchCount));
}
