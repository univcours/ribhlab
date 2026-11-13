// RivoScan AdMob: QA builds use demo inventory; production needs real app-specific IDs.
// Never interrupt scanning or document saving with a full-screen advertisement.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, AppOpenAdPluginEvents, BannerAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

const adEnv=import.meta.env||{};
const liveAds=adEnv.VITE_RIVO_ADMOB_MODE==='live';
const demoPublisher='ca-app-pub-3940256099942544';
export const AD_CONFIG=Object.freeze({
 testMode:!liveAds,
 androidAppId:liveAds?(adEnv.VITE_RIVO_ADMOB_APP_ID||''):demoPublisher+'~3347511713',
 banner:liveAds?(adEnv.VITE_RIVO_ADMOB_BANNER_ID||''):demoPublisher+'/6300978111',
 rewarded:liveAds?(adEnv.VITE_RIVO_ADMOB_REWARDED_ID||''):demoPublisher+'/5224354917',
 interstitial:liveAds?(adEnv.VITE_RIVO_ADMOB_INTERSTITIAL_ID||''):demoPublisher+'/1033173712',
 appOpen:liveAds?(adEnv.VITE_RIVO_ADMOB_APP_OPEN_ID||''):demoPublisher+'/9257395921',
 bannerEnabled:!liveAds||/^ca-app-pub-\d{16}\/\d+$/.test(adEnv.VITE_RIVO_ADMOB_BANNER_ID||'')
});
export function productionAdsConfigured(config=AD_CONFIG){
 const appOk=/^ca-app-pub-\d{16}~\d+$/.test(config.androidAppId||'');
 const interOk=/^ca-app-pub-\d{16}\/\d+$/.test(config.interstitial||'');
 const openOk=!config.appOpen||/^ca-app-pub-\d{16}\/\d+$/.test(config.appOpen);
 const bannerOk=/^ca-app-pub-\d{16}\/\d+$/.test(config.banner||'');
 const owner=id=>String(id||'').split(/[~/]/)[0];
 return appOk&&interOk&&openOk&&bannerOk&&owner(config.androidAppId)!==demoPublisher&&
    owner(config.androidAppId)===owner(config.interstitial)&&
    (!config.appOpen||owner(config.appOpen)===owner(config.androidAppId))&&
    owner(config.banner)===owner(config.androidAppId);
}
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
 interstitialReady:false,appOpenReady:false,bannerReady:false,bannerLoading:false,bannerListenersAttached:false,
 bannerError:'',status:'Not initialized',lastError:'',
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
 return {native:isAndroid,ready:state.ready,consent:state.consent,testMode:AD_CONFIG.testMode,bannerEnabled:AD_CONFIG.bannerEnabled,status:state.status,
 lastError:state.lastError,remainingMs:remainingPremiumMs(state.unlockedUntil),
 interstitialReady:state.interstitialReady,appOpenReady:state.appOpenReady,bannerReady:state.bannerReady,bannerError:state.bannerError,
 shownCount:state.shownCount};
}
// Google's native 320x50dp banner is centered in a dedicated row below
// the sticky topbar. Avoid all navigation/scan buttons and never alter ad art.
function setBannerSpace(visible,height=50){
 if(typeof document==='undefined')return;
 document.body.classList.toggle('rivo-has-ad-banner',visible);
 document.documentElement.style.setProperty('--rivo-banner-height',Math.max(50,Number(height)||50)+'px');
}
function bannerMargin(){
 const topbar=document.querySelector('.topbar');
 return Math.round((topbar?.getBoundingClientRect().bottom||54)+9);
}
async function loadBanner(){
 if(!state.ready||!AD_CONFIG.bannerEnabled||state.bannerReady||state.bannerLoading)return false;
 if(typeof window==='undefined'||window.innerWidth<320){
  state.bannerError='Screen too narrow for 320x50 banner';return false;
 }
 state.bannerLoading=true;setBannerSpace(true);
 try{
  if(!state.bannerListenersAttached){
   await AdMob.addListener(BannerAdPluginEvents.Loaded,()=>{
    state.bannerReady=true;state.bannerError='';setBannerSpace(true);state.onChange();
   });
   await AdMob.addListener(BannerAdPluginEvents.SizeChanged,dim=>{
    if(dim?.height>0)setBannerSpace(true,dim.height);
   });
   await AdMob.addListener(BannerAdPluginEvents.FailedToLoad,error=>{
    state.bannerReady=false;state.bannerError=String(error?.message||error||'No fill');
    setBannerSpace(false);state.onChange();
   });
   state.bannerListenersAttached=true;
  }
  await AdMob.showBanner({
   adId:AD_CONFIG.banner,adSize:BannerAdSize.BANNER,
   position:BannerAdPosition.TOP_CENTER,margin:bannerMargin(),
   isTesting:AD_CONFIG.testMode
  });
  return true;
 }catch(error){
  state.bannerReady=false;state.bannerError=String(error?.message||error);
  setBannerSpace(false);status('Banner unavailable',state.bannerError);
  return false;
 }finally{state.bannerLoading=false}
}

async function loadInterstitial(){
 if(!state.ready||state.interstitialReady||state.busy)return false;
 try{
  await AdMob.prepareInterstitial({adId:AD_CONFIG.interstitial,isTesting:AD_CONFIG.testMode});
  state.interstitialReady=true;status('Interstitial ready');return true;
 }catch(error){status('Interstitial unavailable',String(error?.message||error));return false;}
}
async function loadAppOpen(){
 if(!AD_CONFIG.appOpen||!state.ready||state.appOpenReady||state.busy)return false;
 try{
  await AdMob.loadAppOpen({adId:AD_CONFIG.appOpen});
  const check=await AdMob.isAppOpenLoaded({adId:AD_CONFIG.appOpen});
  state.appOpenReady=check?.value===true;
  state.onChange();return state.appOpenReady;
 }catch(error){status('App open unavailable',String(error?.message||error));return false;}
}
export async function initializeAds({retry=false}={}){
 if(!isAndroid){status('Ads need the Android app');return false;}
 if(liveAds&&!productionAdsConfigured()){status('Real AdMob publisher IDs missing; ads disabled');return false;}
 if(state.ready){if(retry){void loadInterstitial();void loadAppOpen();void loadBanner();}return true;}
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
   state.ready=true;
   status('AdMob initialized');
   // Never wait for an ad or pop a fullscreen ad at launch. Preload for later.
   void loadInterstitial();
   void loadAppOpen();
   void loadBanner();
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
// All tools are available without explicit rewarded-ad buttons.
// Interstitial/App Open remain consent-gated at natural, non-work transitions.
export async function requestPremium(_id){return true;}
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
