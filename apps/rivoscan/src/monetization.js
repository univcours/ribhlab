// RivoScan Android AdMob field-test monetization.
// Google DEMO unit IDs only. Real units are intentionally disabled until consent,
// privacy policy, AdMob account setup and device QA are complete.
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize, RewardAdPluginEvents } from '@capacitor-community/admob';

export const AD_CONFIG=Object.freeze({
 testMode:true,
 androidAppId:'ca-app-pub-3940256099942544~3347511713',
 banner:'ca-app-pub-3940256099942544/6300978111',
 rewarded:'ca-app-pub-3940256099942544/5224354917',
 interstitial:'ca-app-pub-3940256099942544/1033173712'
});
export const PREMIUM_MINUTES=10;
export const FULLSCREEN_COOLDOWN_MS=8*60*1000;
const PREMIUM_IDS=new Set([
 'bookScan','documentFlatten','formulaOcr','photoTranslation','aiChat','solverAI',
 'countCam','toWord','toWordTables','toExcel','toPpt','toPptEditable',
 'restorePhoto','enhance','eraseColoredMarks','eraseLightWatermark',
 'manualErase','lockPdf','idPhotoMaker','ocr','compress'
]);
export function isPremiumFeature(id){return PREMIUM_IDS.has(String(id||''));}
export function shouldShowInterstitial({native,consent,startedAt,now,lastShownAt,savedCount,shownCount,premiumUntil}){
 return Boolean(native&&consent&&savedCount>=2&&shownCount<3&&
    now-startedAt>=120000&&(!lastShownAt||now-lastShownAt>=FULLSCREEN_COOLDOWN_MS)&&now>=premiumUntil);
}
export function remainingPremiumMs(until,now=Date.now()){
 return Math.max(0,Number(until||0)-now);
}
const nativeAndroid=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
const state={startedAt:Date.now(),initializing:null,ready:false,consent:false,
 unlockedUntil:0,savedCount:0,shownCount:0,lastShownAt:0,fullscreenBusy:false,
 language:'en',notify:()=>{},onChange:()=>{},bannerShowing:false};
const labels={
 ar:{title:'فتح الميزات المتقدمة',detail:'شاهد فيديو إعلاني باختيارك باش تفتح جميع الميزات المتقدمة لمدة 10 دقائق. إذا ما توفرش الإعلان، جرب من بعد. السكان العادي والملفات ديالك كيبقاو متاحين.',watch:'مشاهدة الفيديو وفتح 10 دقائق',cancel:'رجوع',loading:'جار تحميل الإعلان...',unavailable:'الإعلان غير متوفر حالياً. جرب من بعد.',success:'تفتحات الميزات المتقدمة لمدة 10 دقائق',privacy:'خيارات خصوصية الإعلانات'},
 fr:{title:'Débloquer les outils avancés',detail:'Regardez volontairement une publicité récompensée pour 10 minutes d’accès aux outils avancés. La numérisation simple et vos fichiers restent disponibles.',watch:'Voir une vidéo · 10 minutes',cancel:'Retour',loading:'Chargement de la publicité...',unavailable:'Publicité indisponible, réessayez plus tard.',success:'Outils avancés ouverts pour 10 minutes',privacy:'Confidentialité des annonces'},
 en:{title:'Unlock advanced tools',detail:'Choose to watch a rewarded video for 10 minutes of access to advanced tools. If no ad is available, try later. Basic scanning and your saved files remain accessible.',watch:'Watch video · unlock 10 minutes',cancel:'Not now',loading:'Loading ad...',unavailable:'Ad unavailable right now. Please try again later.',success:'Advanced tools unlocked for 10 minutes',privacy:'Ad privacy choices'}
};
function t(){return labels[state.language]||labels.en;}
export function configureAds({getLanguage,notify,onChange}={}){
 if(typeof getLanguage==='function')state.getLanguage=getLanguage;
 if(typeof notify==='function')state.notify=notify;
 if(typeof onChange==='function')state.onChange=onChange;
}
function syncLanguage(){state.language=state.getLanguage?.()||'en';}
export function getPremiumStatus(){return {native:nativeAndroid,ready:state.ready,consent:state.consent,remainingMs:remainingPremiumMs(state.unlockedUntil)};}
export async function initializeAds(){
 if(!nativeAndroid)return false;
 if(state.initializing)return state.initializing;
 state.initializing=(async()=>{
  try{
   await AdMob.initialize({initializeForTesting:true});
   let consent=await AdMob.requestConsentInfo();
   if(!consent.canRequestAds&&consent.isConsentFormAvailable){
    consent=await AdMob.showConsentForm();
   }
   if(!consent.canRequestAds){state.consent=false;return false;}
   state.consent=true;
   await AdMob.showBanner({adId:AD_CONFIG.banner,adSize:BannerAdSize.BANNER,
      position:BannerAdPosition.BOTTOM_CENTER,margin:76,isTesting:true});
   state.bannerShowing=true;
   document.body.classList.add('rivo-has-ad-banner');
   state.ready=true;
   state.onChange();
   return true;
  }catch(error){
   // Never show a fake banner or demand a reward without an actual ad.
   console.warn('RivoScan ads not ready:',String(error?.message||error));
   state.consent=false;state.ready=false;return false;
  }
 })();
 return state.initializing;
}
function rewardPrompt(){
 syncLanguage();
 return new Promise(resolve=>{
  if(typeof document==='undefined'){resolve(false);return;}
  document.querySelector('.rivo-reward-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='rivo-reward-overlay';overlay.setAttribute('role','presentation');
  const modal=document.createElement('div');
  modal.className='rivo-reward-dialog';modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  const heading=document.createElement('h2');heading.textContent=t().title;
  const detail=document.createElement('p');detail.textContent=t().detail;
  const watch=document.createElement('button');watch.type='button';
  watch.className='rivo-reward-watch';watch.textContent=t().watch;
  const cancel=document.createElement('button');cancel.type='button';
  cancel.className='rivo-reward-cancel';cancel.textContent=t().cancel;
  function finish(value){overlay.remove();resolve(value);}
  watch.addEventListener('click',()=>finish(true));
  cancel.addEventListener('click',()=>finish(false));
  modal.append(heading,detail,watch,cancel);overlay.append(modal);
  document.body.append(overlay);cancel.focus();
 });
}
export async function requestPremium(id){
 if(!isPremiumFeature(id)||!nativeAndroid)return true;
 if(remainingPremiumMs(state.unlockedUntil)>0)return true;
 if(state.fullscreenBusy)return false;
 if(!(await rewardPrompt()))return false;
 await initializeAds();
 if(!state.consent){syncLanguage();state.notify(t().unavailable,true);return false;}
 state.fullscreenBusy=true;
 let rewarded=false,listener;
 try{
  listener=await AdMob.addListener(RewardAdPluginEvents.Rewarded,()=>{rewarded=true;});
  await AdMob.prepareRewardVideoAd({adId:AD_CONFIG.rewarded,isTesting:true});
  const result=await AdMob.showRewardVideoAd();
  // Verify actual SDK reward: simply closing or skipping the video never unlocks.
  if(!rewarded && !(result&&typeof result.amount==='number'&&result.amount>0))
   return false;
  state.unlockedUntil=Date.now()+PREMIUM_MINUTES*60*1000;
  state.onChange();syncLanguage();state.notify(t().success);
  return true;
 }catch(error){
  console.warn('Rewarded ad not completed:',String(error?.message||error));
  syncLanguage();state.notify(t().unavailable,true);return false;
 }finally{await listener?.remove().catch(()=>{});state.fullscreenBusy=false;}
}
export function onDocumentSaved(){if(nativeAndroid)state.savedCount++;}
export async function atNaturalNavigation(){
 if(state.fullscreenBusy||!nativeAndroid)return false;
 const now=Date.now();
 if(!shouldShowInterstitial({native:nativeAndroid,consent:state.consent,startedAt:state.startedAt,
    now,lastShownAt:state.lastShownAt,savedCount:state.savedCount,
    shownCount:state.shownCount,premiumUntil:state.unlockedUntil}))return false;
 state.fullscreenBusy=true;
 try{
  await AdMob.prepareInterstitial({adId:AD_CONFIG.interstitial,isTesting:true});
  await AdMob.showInterstitial();
  state.lastShownAt=Date.now();state.shownCount++;state.savedCount=0;
  return true;
 }catch(error){console.warn('Interstitial not shown:',String(error?.message||error));return false;}
 finally{state.fullscreenBusy=false;}
}
export async function openAdPrivacyOptions(){
 if(!nativeAndroid)return false;
 try{await AdMob.showPrivacyOptionsForm();return true;}
 catch(error){console.warn('Ad privacy options:',String(error?.message||error));return false;}
}
