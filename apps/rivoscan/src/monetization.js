// RivoScan AdMob: two real production units; safe demo units for debug.
// No rewarded ads, video-to-unlock flow, or banners.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import {buildProductionAds,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID,RIVOSCAN_ADMOB_APP_ID} from './admob-production-ids.js';

const adEnv=import.meta.env||{};
const productionAds=adEnv.VITE_RIVOSCAN_ADMOB_PRODUCTION==='true';
const liveUnits=buildProductionAds({
 appId:adEnv.VITE_RIVOSCAN_ADMOB_APP_ID||RIVOSCAN_ADMOB_APP_ID
});
// Google sample IDs serve TEST ads on locally installed debug builds.
const demoInterstitial='ca-app-pub-3940256099942544/1033173712';
const demoAppOpen='ca-app-pub-3940256099942544/9257395921';
export const AD_CONFIG=Object.freeze({
 testMode:!productionAds,
 configured:productionAds?liveUnits.configured:true,
 androidAppId:RIVOSCAN_ADMOB_APP_ID,
 interstitial:productionAds?RIVOSCAN_INTERSTITIAL_ID:demoInterstitial,
 appOpen:productionAds?RIVOSCAN_APP_OPEN_ID:demoAppOpen,
 bannerEnabled:false
});
export const FULLSCREEN_COOLDOWN_MS=8*60*1000;
export const APP_OPEN_COOLDOWN_MS=20*60*1000;
export const MIN_BACKGROUND_MS=60*1000;
// All tools are available without any rewarded-video gate.
export function isPremiumFeature(){return false;}
export function shouldShowInterstitial({native,consent,startedAt,now,lastShownAt,savedCount,shownCount,ready=true,trigger='regular',backTransitions=0}){
 // A Back press is a natural page transition only when returning from an
 // actual tool to Home, after either a completed save or two tool returns.
 // Never treat dismissing an overlay or exiting the app as an ad opportunity.
 const meaningfulBreak=trigger==='back'
  ?(savedCount>=1||backTransitions>=2)
  :savedCount>=2;
 return !!(native&&consent&&ready&&meaningfulBreak&&shownCount<3&&
  now-startedAt>=120000&&(!lastShownAt||now-lastShownAt>=FULLSCREEN_COOLDOWN_MS));
}
export function shouldShowAppOpen({native,consent,ready,backgroundMs,now,lastFullscreenAt=0,working=false}){
 return !!(native&&consent&&ready&&!working&&backgroundMs>=MIN_BACKGROUND_MS&&
  (!lastFullscreenAt||now-lastFullscreenAt>=APP_OPEN_COOLDOWN_MS));
}
const isAndroid=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
const state={startedAt:Date.now(),initializing:null,ready:false,consent:false,
 savedCount:0,backTransitions:0,shownCount:0,lastFullscreenAt:0,busy:false,
 interstitialReady:false,appOpenReady:false,status:'Not initialized',lastError:'',
 getLanguage:()=> 'en',notify:()=>{},onChange:()=>{}};
const status=(value,error='')=>{state.status=value;state.lastError=error;state.onChange();};
export function configureAds({getLanguage,notify,onChange}={}){
 if(typeof getLanguage==='function')state.getLanguage=getLanguage;
 if(typeof notify==='function')state.notify=notify;
 if(typeof onChange==='function')state.onChange=onChange;
}
export function getPremiumStatus(){
 return {native:isAndroid,ready:state.ready,consent:state.consent,status:state.status,
 lastError:state.lastError,testMode:AD_CONFIG.testMode,configured:AD_CONFIG.configured,
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
   await AdMob.initialize(productionAds?{}:{initializeForTesting:true});
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
// Full-screen ads only at consented natural breaks, never during editing or saving.
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
    trigger,backTransitions:state.backTransitions}))return false;
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
    working}))return false;
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
