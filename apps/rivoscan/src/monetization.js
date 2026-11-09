// RivoScan Android AdMob field QA: no banner, no real ads in debug builds.
// Production AdMob APP ID is NOT known; do not substitute an ad unit ID for it.
// Google sample units prevent invalid paid traffic during development.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, AppOpenAdPluginEvents } from '@capacitor-community/admob';

export const AD_CONFIG=Object.freeze({
 testMode:true,
 androidAppId:'ca-app-pub-3940256099942544~3347511713',
 rewarded:'ca-app-pub-3940256099942544/5224354917',
 interstitial:'ca-app-pub-3940256099942544/1033173712',
 appOpen:'ca-app-pub-3940256099942544/9257395921',
 bannerEnabled:false
});
export const PREMIUM_MINUTES=10;
export const FULLSCREEN_COOLDOWN_MS=8*60*1000;
export const APP_OPEN_COOLDOWN_MS=20*60*1000;
export const MIN_BACKGROUND_MS=60*1000;
const PREMIUM_IDS=new Set([
 'bookScan','documentFlatten','formulaOcr','photoTranslation','aiChat','solverAI',
 'countCam','toWord','toWordTables','toExcel','toPpt','toPptEditable',
 'restorePhoto','enhance','eraseColoredMarks','eraseLightWatermark',
 'manualErase','lockPdf','idPhotoMaker','ocr','compress'
]);
export function isPremiumFeature(id){return PREMIUM_IDS.has(String(id||''));}
export function remainingPremiumMs(until,now=Date.now()){return Math.max(0,Number(until||0)-now);}
export function shouldShowInterstitial({native,consent,startedAt,now,lastShownAt,savedCount,shownCount,premiumUntil,ready=true,trigger='regular',backTransitions=0}){
 // A Back press is a natural page transition only when returning from an
 // actual tool to Home, after either a completed save or two tool returns.
 // Never treat dismissing an overlay or exiting the app as an ad opportunity.
 const meaningfulBreak=trigger==='back'
  ?(savedCount>=1||backTransitions>=2)
  :savedCount>=2;
 return !!(native&&consent&&ready&&meaningfulBreak&&shownCount<3&&
  now-startedAt>=120000&&(!lastShownAt||now-lastShownAt>=FULLSCREEN_COOLDOWN_MS)&&
  now>=premiumUntil);
}
export function shouldShowAppOpen({native,consent,ready,backgroundMs,now,lastFullscreenAt=0,premiumUntil=0,working=false}){
 return !!(native&&consent&&ready&&!working&&backgroundMs>=MIN_BACKGROUND_MS&&
  now>=premiumUntil&&(!lastFullscreenAt||now-lastFullscreenAt>=APP_OPEN_COOLDOWN_MS));
}
const isAndroid=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
const state={startedAt:Date.now(),initializing:null,ready:false,consent:false,
 unlockedUntil:0,savedCount:0,backTransitions:0,shownCount:0,lastFullscreenAt:0,busy:false,
 interstitialReady:false,appOpenReady:false,status:'Not initialized',lastError:'',
 getLanguage:()=> 'en',notify:()=>{},onChange:()=>{}};
const strings={
 en:{title:'Unlock advanced tools',body:'Watch a rewarded ad by choice to unlock all advanced tools for 10 minutes. Your documents and basic scanner stay available without ads.',watch:'Watch video · 10 minutes',cancel:'Not now',unavailable:'Ad not ready. Open Me → Ad diagnostics to retry.',success:'Advanced tools unlocked for 10 minutes.'},
 ar:{title:'فتح الأدوات المتقدمة',body:'شاهد فيديو إعلاني باختيارك لفتح الأدوات المتقدمة لمدة 10 دقائق. السكان الأساسي والملفات ديالك كيبقاو متاحين.',watch:'شاهد الفيديو · 10 دقائق',cancel:'رجوع',unavailable:'الإعلان مازال ما وجدش. دخل للإعدادات > تشخيص الإشهارات وعاود المحاولة.',success:'تفتحات الميزات المتقدمة لمدة 10 دقائق.'},
 fr:{title:'Débloquer les outils avancés',body:'Regardez volontairement une publicité pour accéder aux outils avancés pendant 10 minutes. Documents et scan simple restent disponibles.',watch:'Voir une vidéo · 10 min',cancel:'Retour',unavailable:'Publicité indisponible. Réessayez dans Diagnostics publicitaires.',success:'Outils avancés débloqués pour 10 minutes.'}
};
const tr=()=>strings[state.getLanguage()]||strings.en;
const status=(value,error='')=>{state.status=value;state.lastError=error;state.onChange();};
export function configureAds({getLanguage,notify,onChange}={}){
 if(typeof getLanguage==='function')state.getLanguage=getLanguage;
 if(typeof notify==='function')state.notify=notify;
 if(typeof onChange==='function')state.onChange=onChange;
}
export function getPremiumStatus(){
 return {native:isAndroid,ready:state.ready,consent:state.consent,status:state.status,
 lastError:state.lastError,remainingMs:remainingPremiumMs(state.unlockedUntil),
 interstitialReady:state.interstitialReady,appOpenReady:state.appOpenReady,
 shownCount:state.shownCount};
}
async function loadInterstitial(){
 if(!state.ready||state.interstitialReady||state.busy)return false;
 try{
  await AdMob.prepareInterstitial({adId:AD_CONFIG.interstitial,isTesting:AD_CONFIG.testMode});
  state.interstitialReady=true;status('Interstitial ready');return true;
 }catch(error){status('Interstitial unavailable',String(error?.message||error));return false;}
}
async function loadAppOpen(){
 if(!state.ready||state.appOpenReady||state.busy)return false;
 try{
  await AdMob.loadAppOpen({adId:AD_CONFIG.appOpen});
  const check=await AdMob.isAppOpenLoaded({adId:AD_CONFIG.appOpen});
  state.appOpenReady=check?.value===true;
  state.onChange();return state.appOpenReady;
 }catch(error){status('App open unavailable',String(error?.message||error));return false;}
}
export async function initializeAds({retry=false}={}){
 if(!isAndroid){status('Ads need the Android app');return false;}
 if(state.ready)return true;
 if(state.initializing)return state.initializing;
 state.initializing=(async()=>{
  try{
   status('Checking ad consent');
   // Google UMP must run BEFORE AdMob.initialize; do not treat an optional form
   // as mandatory for non-EEA users, and never bypass canRequestAds=false.
   let consent=await AdMob.requestConsentInfo();
   if(consent.isConsentFormAvailable&&consent.status===AdmobConsentStatus.REQUIRED)
    consent=await AdMob.showConsentForm();
   state.consent=consent.canRequestAds===true;
   if(!state.consent){status('Ads unavailable: privacy choice / consent not ready');return false;}
   await AdMob.initialize();
   // Explicitly clear an obsolete banner if the old app previously showed one.
   await AdMob.removeBanner().catch(()=>{});
   document.body.classList.remove('rivo-has-ad-banner');
   state.ready=true;
   status('AdMob initialized');
   // Never wait for an ad or pop a fullscreen ad at launch. Preload for later.
   void loadInterstitial();
   void loadAppOpen();
   return true;
  }catch(error){
   state.ready=false;
   status('AdMob initialization failed',String(error?.message||error));
   console.warn('AdMob initialization failed:',String(error?.message||error));
   return false;
  }finally{state.initializing=null;}
 })();
 return state.initializing;
}
function offerReward(){
 return new Promise(resolve=>{
  if(typeof document==='undefined'){resolve(false);return;}
  document.querySelector('.rivo-reward-overlay .rivo-reward-cancel')?.click();
  const overlay=document.createElement('div');overlay.className='rivo-reward-overlay';
  const dialog=document.createElement('div');dialog.className='rivo-reward-dialog';
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  const h=document.createElement('h2');h.textContent=tr().title;
  const p=document.createElement('p');p.textContent=tr().body;
  const watch=document.createElement('button');watch.className='rivo-reward-watch';watch.textContent=tr().watch;
  const cancel=document.createElement('button');cancel.className='rivo-reward-cancel';cancel.textContent=tr().cancel;
  const finish=v=>{overlay.remove();resolve(v);};
  watch.addEventListener('click',()=>finish(true));cancel.addEventListener('click',()=>finish(false));
  dialog.append(h,p,watch,cancel);overlay.append(dialog);document.body.append(overlay);cancel.focus();
 });
}
export async function requestPremium(id){
 if(!isPremiumFeature(id)||!isAndroid)return true;
 if(remainingPremiumMs(state.unlockedUntil)>0)return true;
 if(state.busy||!(await offerReward()))return false;
 if(!(await initializeAds())){state.notify(tr().unavailable,true);return false;}
 if(state.busy)return false;
 state.busy=true;
 let receivedReward=false,listener;
 try{
  listener=await AdMob.addListener(RewardAdPluginEvents.Rewarded,reward=>{
   if(Number(reward?.amount)>0)receivedReward=true;
  });
  status('Loading rewarded video');
  await AdMob.prepareRewardVideoAd({adId:AD_CONFIG.rewarded,isTesting:AD_CONFIG.testMode});
  const reward=await AdMob.showRewardVideoAd({adId:AD_CONFIG.rewarded});
  if(!receivedReward&&!(Number(reward?.amount)>0)){
   status('Video dismissed without reward');return false;
  }
  state.unlockedUntil=Date.now()+PREMIUM_MINUTES*60000;
  state.lastFullscreenAt=Date.now();
  status('Reward granted: 10 minutes');state.notify(tr().success);return true;
 }catch(error){
  status('Rewarded video failed',String(error?.message||error));state.notify(tr().unavailable,true);
  return false;
 }finally{
  await listener?.remove().catch(()=>{});
  state.busy=false;
 }
}
export function onDocumentSaved(){if(isAndroid)state.savedCount++;}
export async function atNaturalNavigation({working=false,trigger='regular'}={}){
 if(state.busy||working)return false;
 // Count actual tool -> Home transitions, not button taps, gesture duplicates
 // or app-exit presses. A first Back without work remains advertisement-free.
 if(trigger==='back')state.backTransitions++;
 if(!state.interstitialReady)return false;
 const now=Date.now();
 if(!shouldShowInterstitial({native:isAndroid,consent:state.consent,ready:state.ready,
    startedAt:state.startedAt,now,lastShownAt:state.lastFullscreenAt,
    savedCount:state.savedCount,shownCount:state.shownCount,
    premiumUntil:state.unlockedUntil,trigger,backTransitions:state.backTransitions}))return false;
 state.busy=true;state.interstitialReady=false;
 try{
  // Preloaded full-screen ad can contain video; its creative is chosen by
  // AdMob. Never wait for fresh network loading when the user presses Back.
  await AdMob.showInterstitial({adId:AD_CONFIG.interstitial});
  state.lastFullscreenAt=Date.now();state.shownCount++;state.savedCount=0;
  state.backTransitions=0;
  status(trigger==='back'?'Interstitial shown on return to Home':'Interstitial shown');
  return true;
 }catch(error){status('Interstitial failed',String(error?.message||error));return false;}
 finally{state.busy=false;void loadInterstitial();}
}
export async function onAppForeground({backgroundMs=0,working=false}={}){
 if(!state.appOpenReady||state.busy)return false;
 const now=Date.now();
 if(!shouldShowAppOpen({native:isAndroid,consent:state.consent,ready:state.ready,
    backgroundMs,now,lastFullscreenAt:state.lastFullscreenAt,
    premiumUntil:state.unlockedUntil,working}))return false;
 state.busy=true;state.appOpenReady=false;
 try{
  await AdMob.showAppOpen({adId:AD_CONFIG.appOpen});
  state.lastFullscreenAt=Date.now();status('App open shown');
  return true;
 }catch(error){status('App open failed',String(error?.message||error));return false;}
 finally{state.busy=false;void loadAppOpen();}
}
export async function showTestInterstitial(){
 if(!AD_CONFIG.testMode||!isAndroid)return false;
 if(!(await initializeAds()))return false;
 if(!state.interstitialReady){await loadInterstitial();}
 if(!state.interstitialReady||state.busy)return false;
 state.busy=true;state.interstitialReady=false;
 try{
  await AdMob.showInterstitial({adId:AD_CONFIG.interstitial});
  state.lastFullscreenAt=Date.now();status('TEST interstitial shown');return true;
 }catch(error){status('TEST interstitial failed',String(error?.message||error));return false;}
 finally{state.busy=false;void loadInterstitial();}
}
export async function openAdPrivacyOptions(){
 if(!isAndroid)return false;
 try{await AdMob.showPrivacyOptionsForm();return true;}
 catch(error){status('Privacy options unavailable',String(error?.message||error));return false;}
}
