// AdMob: RivoScan verified publisher units ONLY in explicit production.
 // Developer APKs never request test or real ads.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import {buildProductionAds,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID,RIVOSCAN_ADMOB_APP_ID} from './admob-production-ids.js';

const adEnv=import.meta.env||{};
const productionAds=adEnv.VITE_RIVOSCAN_ADMOB_PRODUCTION==='true';
const liveUnits=buildProductionAds({
 appId:adEnv.VITE_RIVOSCAN_ADMOB_APP_ID||RIVOSCAN_ADMOB_APP_ID
});
export const AD_CONFIG=Object.freeze({
 testMode:false,
 configured:productionAds&&liveUnits.configured,
 androidAppId:RIVOSCAN_ADMOB_APP_ID,
 rewarded:productionAds&&liveUnits.configured?liveUnits.rewarded:'',
 interstitial:productionAds&&liveUnits.configured?RIVOSCAN_INTERSTITIAL_ID:'',
 appOpen:productionAds&&liveUnits.configured?RIVOSCAN_APP_OPEN_ID:'',
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
export function isPremiumFeature(){return false;} // All tools are accessible without a rewarded ad.
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
 en:{title:'Unlock advanced tools',body:'Choose to watch a rewarded video to use advanced tools for 10 minutes. Basic scanning and saved documents remain available.',watch:'Watch video',cancel:'Not now',unavailable:'Video unavailable for now. Try again later.',success:'Advanced tools unlocked for 10 minutes.'},
 ar:{title:'فتح الأدوات المتقدمة',body:'يمكن ليك تختار تشاهد فيديو إعلاني باش تستعمل الأدوات المتقدمة لمدة 10 دقائق. السكان الأساسي والملفات متاحين.',watch:'شاهد الفيديو',cancel:'رجوع',unavailable:'الفيديو مازال ما متوفرش، عاود من بعد.',success:'تفتحات الميزات المتقدمة لمدة 10 دقائق.'},
 fr:{title:'Débloquer les outils avancés',body:'Choisissez de regarder une vidéo publicitaire pour accéder aux outils avancés pendant 10 minutes. Le scan simple reste accessible.',watch:'Voir la vidéo',cancel:'Retour',unavailable:'Vidéo indisponible pour le moment.',success:'Outils avancés débloqués pour 10 minutes.'}
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
 lastError:state.lastError,testMode:AD_CONFIG.testMode,configured:AD_CONFIG.configured,rewardedAvailable:!!AD_CONFIG.rewarded,remainingMs:remainingPremiumMs(state.unlockedUntil),
 interstitialReady:state.interstitialReady,appOpenReady:state.appOpenReady,
 shownCount:state.shownCount};
}
async function loadInterstitial(){
 if(!state.ready||!AD_CONFIG.interstitial||state.interstitialReady||state.busy)return false;
 try{
  await AdMob.prepareInterstitial({adId:AD_CONFIG.interstitial,isTesting:AD_CONFIG.testMode});
  state.interstitialReady=true;status('Interstitial ready');return true;
 }catch(error){status('Interstitial unavailable',String(error?.message||error));return false;}
}
async function loadAppOpen(){
 if(!state.ready||!AD_CONFIG.appOpen||state.appOpenReady||state.busy)return false;
 try{
  await AdMob.loadAppOpen({adId:AD_CONFIG.appOpen});
  const check=await AdMob.isAppOpenLoaded({adId:AD_CONFIG.appOpen});
  state.appOpenReady=check?.value===true;
  state.onChange();return state.appOpenReady;
 }catch(error){status('App open unavailable',String(error?.message||error));return false;}
}
export async function initializeAds({retry=false}={}){
 if(!isAndroid){status('AdMob is only available on Android');return false;}
 if(!productionAds){status('Developer build: monetization disabled');return false;}
 if(!AD_CONFIG.configured){status('RivoScan production AdMob App ID missing or invalid');return false;}
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
// Ads display automatically at consented natural breaks, never as a gate.
export async function requestPremium(){return true;}
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
export async function openAdPrivacyOptions(){
 if(!isAndroid)return false;
 try{await AdMob.showPrivacyOptionsForm();return true;}
 catch(error){status('Privacy options unavailable',String(error?.message||error));return false;}
}
