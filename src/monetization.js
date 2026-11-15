// RivoScan AdMob: QA builds use demo inventory; production needs real app-specific IDs.
// Never interrupt scanning or document saving with a full-screen advertisement.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, InterstitialAdPluginEvents, BannerAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import {calculateAdLayout,nativeAdFits} from './rivo-native-ad-geometry.js';

const adEnv=import.meta.env||{};
const liveAds=adEnv.VITE_RIVO_ADMOB_MODE==='live';
const demoPublisher='ca-app-pub-3940256099942544';
export const AD_CONFIG=Object.freeze({
 testMode:!liveAds,
 androidAppId:liveAds?(adEnv.VITE_RIVO_ADMOB_APP_ID||''):demoPublisher+'~3347511713',
 banner:liveAds?(adEnv.VITE_RIVO_ADMOB_BANNER_ID||''):demoPublisher+'/6300978111',
 rewarded:liveAds?(adEnv.VITE_RIVO_ADMOB_REWARDED_ID||''):demoPublisher+'/5224354917',
 interstitial:liveAds?(adEnv.VITE_RIVO_ADMOB_INTERSTITIAL_ID||''):demoPublisher+'/1033173712',
 bannerEnabled:!liveAds||/^ca-app-pub-\d{16}\/\d+$/.test(adEnv.VITE_RIVO_ADMOB_BANNER_ID||'')
});
export function productionAdsConfigured(config=AD_CONFIG){
 const appOk=/^ca-app-pub-\d{16}~\d+$/.test(config.androidAppId||'');
 const interOk=/^ca-app-pub-\d{16}\/\d+$/.test(config.interstitial||'');
 const bannerOk=!config.banner||/^ca-app-pub-\d{16}\/\d+$/.test(config.banner);
 const owner=id=>String(id||'').split(/[~/]/)[0];
 return appOk&&interOk&&bannerOk&&owner(config.androidAppId)!==demoPublisher&&
    owner(config.androidAppId)===owner(config.interstitial)&&
    (!config.banner||owner(config.banner)===owner(config.androidAppId));
}
// Onboarding protects first-time users from full-screen ads. One use = one
// process/cold launch, not button taps or foreground resume events.
export const FULLSCREEN_START_LAUNCH=5;
export const APP_LAUNCH_KEY='rivo-ad-launch-count-v1';
export const FULLSCREEN_LAST_SHOWN_KEY='rivo-ad-last-fullscreen-v1';
export function registerLaunch(storage){
 if(!storage)return 0;
 try {
  const prior=Math.max(0,Math.min(1000000,Math.trunc(Number(storage.getItem(APP_LAUNCH_KEY))||0)));
  const next=prior+1;
  storage.setItem(APP_LAUNCH_KEY,String(next));
  return next;
 }catch{return 0}
}
export function launchEligible(count){return Number(count)>=FULLSCREEN_START_LAUNCH}
export function shouldCountWarmSession({backgroundMs=0,working=false,fullScreenAd=false}={}){
 // A real return after at least one minute counts as a new usage session,
 // even when Android kept the process in memory after Home / Back.
 return backgroundMs>=MIN_BACKGROUND_MS&&!working&&!fullScreenAd;
}
function storedTime(key){
 try{return Math.max(0,Number(localStorage.getItem(key))||0)}catch{return 0}
}
function recordFullscreenTime(now=Date.now()){
 state.lastFullscreenAt=now;
 try{localStorage.setItem(FULLSCREEN_LAST_SHOWN_KEY,String(now))}catch{}
}
export const PREMIUM_MINUTES=10;
export const FULLSCREEN_COOLDOWN_MS=2*60*1000; // 2+ actual actions and a completed-task break still required
export const MIN_BACKGROUND_MS=60*1000;
const PREMIUM_IDS=new Set([
 'bookScan','documentFlatten','formulaOcr','photoTranslation','aiChat','solverAI',
 'countCam','toWord','toWordTables','toExcel','toPpt','toPptEditable',
 'restorePhoto','enhance','eraseColoredMarks','eraseLightWatermark',
 'manualErase','lockPdf','idPhotoMaker','ocr','compress'
]);
export function isPremiumFeature(id){return PREMIUM_IDS.has(String(id||''));}
export function remainingPremiumMs(until,now=Date.now()){return Math.max(0,Number(until||0)-now);}
export function shouldShowInterstitial({native,consent,startedAt,now,lastShownAt,savedCount,shownCount,premiumUntil,ready=true,trigger='regular',backTransitions=0,launchCount=0}){
 // The fifth and later launches can monetize natural transitions, never exit.
 // Even with higher inventory, do not show after each tap (at least 2 real actions).
 // A Back press is a natural page transition only when returning from an
 // actual tool to Home, after either a completed save or two tool returns.
 // Never treat dismissing an overlay or exiting the app as an ad opportunity.
 const meaningfulBreak=trigger==='back'
  ?(savedCount>=1||backTransitions>=2)
  :savedCount>=2;
 return !!(native&&consent&&ready&&launchEligible(launchCount)&&meaningfulBreak&&shownCount<8&&
  now-startedAt>=90000&&(!lastShownAt||now-lastShownAt>=FULLSCREEN_COOLDOWN_MS)&&
  now>=premiumUntil);
}
const isAndroid=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
// SDK-measured diagnostic counters, not estimates of money earned.
const adStats={bannerRequests:0,bannerLoads:0,bannerImpressions:0,
 interstitialRequests:0,interstitialLoads:0,interstitialImpressions:0,
 lastBannerError:'',lastInterstitialError:''};
let impressionListenersAttached=false;
async function trackNativeAdEvents(){
 if(impressionListenersAttached)return;
 try{
  for(const [event,handle] of [
   [BannerAdPluginEvents.AdImpression,()=>{adStats.bannerImpressions++;state.onChange()}],
   [InterstitialAdPluginEvents.AdImpression,()=>{adStats.interstitialImpressions++;state.onChange()}],
   [BannerAdPluginEvents.FailedToLoad,e=>{adStats.lastBannerError=String(e?.message||e||'No fill');state.onChange()}],
   [InterstitialAdPluginEvents.FailedToLoad,e=>{adStats.lastInterstitialError=String(e?.message||e||'No fill');state.onChange()}]
  ]) await AdMob.addListener(event,handle);
  impressionListenersAttached=true;
 }catch(e){console.warn('AdMob native diagnostics listener',e)}
}
const state={startedAt:Date.now(),initializing:null,ready:false,consent:false,
 launchCount:registerLaunch(isAndroid&&typeof localStorage!=='undefined'?localStorage:null),
 unlockedUntil:0,savedCount:0,backTransitions:0,shownCount:0,lastFullscreenAt:storedTime(FULLSCREEN_LAST_SHOWN_KEY),busy:false,
 interstitialReady:false,bannerReady:false,bannerLoading:false,bannerListenersAttached:false,bannerHidden:false,
 bannerError:'',status:'Not initialized',lastError:'',
 getLanguage:()=> 'en',notify:()=>{},onChange:()=>{}};
// AdMob can return NO_FILL even when configured correctly. Retry with bounded
// backoff while the app is foregrounded; never hammer the network or UMP.
const retryCounts={banner:0,interstitial:0};
const retryTimers={banner:null,interstitial:null};
function scheduleAdRetry(type){
 if(!isAndroid||!state.ready||!state.consent||retryTimers[type])return;
 if(retryCounts[type]>=3)return;
 const delay=[60000,120000,240000][retryCounts[type]++];
 retryTimers[type]=setTimeout(()=>{
  retryTimers[type]=null;
  if(document.visibilityState==='hidden')return;
  if(type==='banner')void loadBanner();
  else if(type==='interstitial')void loadInterstitial();
 },delay);
}
const strings={
 en:{title:'Unlock advanced tools',body:'Watch a rewarded ad by choice to unlock all advanced tools for 10 minutes. Your documents and basic scanner stay available without ads.',watch:'Watch video · 10 minutes',cancel:'Not now',unavailable:'Ad currently unavailable. Please try again later.',success:'Advanced tools unlocked for 10 minutes.'},
 ar:{title:'فتح الأدوات المتقدمة',body:'شاهد فيديو إعلاني باختيارك لفتح الأدوات المتقدمة لمدة 10 دقائق. السكان الأساسي والملفات ديالك كيبقاو متاحين.',watch:'شاهد الفيديو · 10 دقائق',cancel:'رجوع',unavailable:'الإعلان مازال ما متوفرش دابا. عاود المحاولة من بعد.',success:'تفتحات الميزات المتقدمة لمدة 10 دقائق.'},
 fr:{title:'Débloquer les outils avancés',body:'Regardez volontairement une publicité pour accéder aux outils avancés pendant 10 minutes. Documents et scan simple restent disponibles.',watch:'Voir une vidéo · 10 min',cancel:'Retour',unavailable:'Publicité indisponible. Veuillez réessayer plus tard.',success:'Outils avancés débloqués pour 10 minutes.'}
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
 interstitialReady:state.interstitialReady,bannerReady:state.bannerReady,bannerError:state.bannerError,
 shownCount:state.shownCount,launchCount:state.launchCount,startLaunch:FULLSCREEN_START_LAUNCH,
  adStats:{...adStats},liveAds};
}
// A real 320x50 native Google banner, with a SEPARATELY SCROLLABLE WebView.
// The native view owns all taps. The WebView content ends ABOVE the ad on ALL
// routes; CSS cannot clip the plugin's separate native View.
let bannerObserver=null,bannerTimer=null,bannerObserved=false;
let bannerLastMargin=-1,bannerWrongSize=false,bannerReconciling=false;
function bannerObstructed(){
 const focus=typeof document!=='undefined'?document.activeElement:null;
 const keyboard=!!(focus&&(/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName)||focus.isContentEditable));
 if(state.busy||keyboard)return true;
 if(typeof document==='undefined')return false;
 const selector=[
  '.rivo-id-overlay','.rivo-code-overlay','.rivo-live-overlay','.rivo-perfectscan-overlay',
  '.rivo-editor-overlay','.rivo-pages-overlay','.rivo-pages-modal','.rivo-page-manager-overlay',
  '.rivo-shield-overlay','.rivo-merged-overlay','.rivo-update-gate',
  '.doc-detail-overlay','.bulk-overlay','.rivo-reward-overlay','.busy',
  'dialog[open]','[role="dialog"][aria-modal="true"]'
 ].join(',');
 return [...document.querySelectorAll(selector)].some(el=>{
  const b=el.getBoundingClientRect(),style=getComputedStyle(el);
  return b.width>0&&b.height>0&&style.visibility!=='hidden'&&style.display!=='none';
 });
}
function currentBannerLayout(){
 if(typeof document==='undefined'||typeof window==='undefined')return {valid:false};
 const nav=document.querySelector('#app nav.mobilebar.rivo-nav-five');
 const shown=nav&&getComputedStyle(nav).display!=='none'&&getComputedStyle(nav).position==='fixed';
 const rect=shown?nav.getBoundingClientRect():null;
 const head=document.querySelector('#app .shell.rivo-dark-ui .topbar');
 const headerBottom=head?.getBoundingClientRect().bottom||70;
 return calculateAdLayout({
  viewportWidth:document.documentElement.clientWidth,
  viewportHeight:window.innerHeight,
  navTop:rect?.top??null,navBottom:rect?.bottom??null,
  headerBottom
 });
}
function setBannerSpace(visible){
 if(typeof document==='undefined')return;
 const layout=currentBannerLayout();
 const show=!!(visible&&layout.valid&&!bannerWrongSize);
 const root=document.documentElement;
 root.style.setProperty('--rivo-banner-height','50px');
 root.style.setProperty('--rivo-banner-width','320px');
 root.style.setProperty('--rivo-content-top',(layout.valid?layout.contentTop:70)+'px');
 root.style.setProperty('--rivo-content-bottom',layout.valid?(
  show?layout.contentBottom:layout.bottomWithoutAd+8
 ):98)+'px');
 if(layout.valid)root.style.setProperty('--rivo-banner-bottom',layout.margin+'px');
 document.body.classList.toggle('rivo-has-ad-banner',show);
}
function observeBannerOverlays(){
 if(typeof document==='undefined'||bannerObserver||typeof MutationObserver==='undefined')return;
 bannerObserver=new MutationObserver(()=>scheduleBannerRelayout());
 bannerObserver.observe(document.body,{childList:true,subtree:true});
 if(!bannerObserved){
  bannerObserved=true;
  window.addEventListener('resize',scheduleBannerRelayout,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleBannerRelayout,{passive:true});
  window.addEventListener('orientationchange',scheduleBannerRelayout,{passive:true});
  document.addEventListener('focusin',scheduleBannerRelayout);
  document.addEventListener('focusout',scheduleBannerRelayout);
  document.addEventListener('visibilitychange',scheduleBannerRelayout);
 }
}
function scheduleBannerRelayout(){
 if(typeof window==='undefined')return;
 if(bannerTimer)clearTimeout(bannerTimer);
 bannerTimer=setTimeout(()=>{bannerTimer=null;void reconcileNativeBanner();},165);
}
export function refreshBannerPosition(){
 // Layout must be recalculated after render(), not just upon ad events.
 if(typeof window==='undefined')return;
 requestAnimationFrame(()=>{setBannerSpace(state.bannerReady&&!state.bannerHidden&&!bannerObstructed());scheduleBannerRelayout();});
}
async function reconcileNativeBanner(){
 if(!state.ready)return;
 if(bannerReconciling){scheduleBannerRelayout();return;}
 bannerReconciling=true;
 try{
  const layout=currentBannerLayout(),blocked=bannerObstructed()||document.visibilityState==='hidden';
  if(!layout.valid||blocked){
   setBannerSpace(false);
   if(state.bannerReady&&!state.bannerHidden){
    state.bannerHidden=true;await AdMob.hideBanner().catch(()=>{});
   }
   return;
  }
  if(state.bannerLoading){setBannerSpace(false);return;}
  if(state.bannerReady&&Math.abs(layout.margin-bannerLastMargin)>1){
   state.bannerReady=false;state.bannerHidden=true;setBannerSpace(false);
   await AdMob.removeBanner().catch(()=>{});
   bannerLastMargin=-1;
   void loadBanner();
   return;
  }
  if(state.bannerReady){
   if(state.bannerHidden){
    await AdMob.resumeBanner().then(()=>{state.bannerHidden=false;setBannerSpace(true)}).catch(()=>setBannerSpace(false));
   }else setBannerSpace(true);
  }else if(!bannerWrongSize)void loadBanner();
 }finally{bannerReconciling=false;}
}
async function loadBanner(){
 if(!state.ready||!AD_CONFIG.bannerEnabled||state.bannerReady||state.bannerLoading||bannerWrongSize)return false;
 const layout=currentBannerLayout();
 if(!layout.valid){state.bannerError=layout.reason||'No safe banner room';setBannerSpace(false);return false;}
 if(bannerObstructed()||document.visibilityState==='hidden'){setBannerSpace(false);return false;}
 state.bannerLoading=true;adStats.bannerRequests++;setBannerSpace(false);
 try{
  if(!state.bannerListenersAttached){
   await AdMob.addListener(BannerAdPluginEvents.Loaded,()=>{
    state.bannerReady=true;retryCounts.banner=0;adStats.bannerLoads++;state.bannerError='';
    observeBannerOverlays();
    if(bannerObstructed()){state.bannerHidden=true;setBannerSpace(false);void AdMob.hideBanner().catch(()=>{});}
    else {state.bannerHidden=false;setBannerSpace(true);}
    state.onChange();
   });
   await AdMob.addListener(BannerAdPluginEvents.SizeChanged,size=>{
    if(!nativeAdFits(size)){
     bannerWrongSize=true;state.bannerReady=false;state.bannerHidden=true;
     state.bannerError='Native ad is larger than its reserved 320x50 viewport';
     setBannerSpace(false);
     void AdMob.hideBanner().then(()=>AdMob.removeBanner()).catch(()=>{});
     state.onChange();return;
    }
    if(state.bannerReady&&!state.bannerHidden)setBannerSpace(true);
   });
   await AdMob.addListener(BannerAdPluginEvents.FailedToLoad,error=>{
    state.bannerReady=false;state.bannerHidden=false;
    state.bannerError=String(error?.message||error||'No fill');
    setBannerSpace(false);scheduleAdRetry('banner');state.onChange();
   });
   state.bannerListenersAttached=true;
  }
  bannerLastMargin=layout.margin;
  await AdMob.showBanner({
   adId:AD_CONFIG.banner,adSize:BannerAdSize.BANNER,
   position:BannerAdPosition.BOTTOM_CENTER,margin:bannerLastMargin,
   isTesting:AD_CONFIG.testMode
  });
  // The reserved viewport is activated ONLY by Loaded, not an empty placeholder.
  return true;
 }catch(error){
  state.bannerReady=false;state.bannerError=String(error?.message||error);
  setBannerSpace(false);status('Banner unavailable',state.bannerError);
  scheduleAdRetry('banner');return false;
 }finally{state.bannerLoading=false;}
}
async function loadInterstitial(){
 if(!state.ready||state.interstitialReady||state.busy)return false;
 try{
  adStats.interstitialRequests++;
  await AdMob.prepareInterstitial({adId:AD_CONFIG.interstitial,isTesting:AD_CONFIG.testMode});
  adStats.interstitialLoads++;retryCounts.interstitial=0;state.interstitialReady=true;status('Interstitial ready');return true;
 }catch(error){status('Interstitial unavailable',String(error?.message||error));scheduleAdRetry('interstitial');return false;}
}
export async function initializeAds({retry=false,deferBanner=false}={}){
 if(!isAndroid){status('Ads need the Android app');return false;}
 if(liveAds&&!productionAdsConfigured()){status('Real AdMob publisher IDs missing; ads disabled');return false;}
 if(state.ready){if(retry){void loadInterstitial();if(!deferBanner)void loadBanner();}return true;}
 if(state.initializing)return state.initializing;
 state.initializing=(async()=>{
  let sdkInitializationStarted=false;
  try{
   status('Checking ad consent');
   // Google UMP must run BEFORE AdMob.initialize; do not treat an optional form
   // as mandatory for non-EEA users, and never bypass canRequestAds=false.
   let consent=await AdMob.requestConsentInfo();
   if(consent.isConsentFormAvailable&&consent.status===AdmobConsentStatus.REQUIRED)
    consent=await AdMob.showConsentForm();
   state.consent=consent.canRequestAds===true;
   if(!state.consent){status('Ads unavailable: privacy choice / consent not ready');return false;}
   sdkInitializationStarted=true;
   await AdMob.initialize();
   state.ready=true;
   void trackNativeAdEvents();
   status('AdMob initialized');
   // Never wait for an ad or pop a fullscreen ad at launch. Preload for later.
   void loadInterstitial();
   if(!deferBanner)void loadBanner();
   return true;
  }catch(error){
   state.ready=false;
   const stage=sdkInitializationStarted?'AdMob initialization failed':'Ad consent configuration unavailable';
   status(stage,String(error?.message||error));
   console.warn(stage+':',String(error?.message||error));
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
// Interstitials remain consent-gated at natural breaks after completed work.
export async function requestPremium(_id){return true;}
// Hide a loaded banner while full-screen content is shown; never layer ads.
async function pauseBannerForFullscreen(){
 if(!state.bannerReady)return;
 state.bannerHidden=true;setBannerSpace(false);
 await AdMob.hideBanner().catch(()=>{});
}
async function restoreBannerAfterFullscreen(){
 if(!state.bannerReady||bannerObstructed())return;
 await AdMob.resumeBanner().then(()=>{state.bannerHidden=false;setBannerSpace(true)}).catch(()=>{});
}
// App Open inventory has been removed. Never show an interstitial on launch.
// Prepare the SDK and pre-load the next natural-break interstitial silently.
export async function startAdsAtLaunch(){
 if(!isAndroid)return false;
 await initializeAds();
 return false;
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
    premiumUntil:state.unlockedUntil,trigger,backTransitions:state.backTransitions,
    launchCount:state.launchCount}))return false;
 state.busy=true;state.interstitialReady=false;
 try{
  // Preloaded full-screen ad can contain video; its creative is chosen by
  // AdMob. Never wait for fresh network loading when the user presses Back.
  await pauseBannerForFullscreen();
  await AdMob.showInterstitial({adId:AD_CONFIG.interstitial});
  recordFullscreenTime();state.shownCount++;state.savedCount=0;
  state.backTransitions=0;
  status(trigger==='back'?'Interstitial shown on return to Home':'Interstitial shown');
  return true;
 }catch(error){status('Interstitial failed',String(error?.message||error));return false;}
 finally{state.busy=false;void restoreBannerAfterFullscreen();void loadInterstitial();}
}
export async function onAppForeground({backgroundMs=0,working=false}={}){
 if(isAndroid&&!working)void initializeAds({retry:true});
 if(isAndroid&&shouldCountWarmSession({backgroundMs,working,fullScreenAd:state.busy})){
  try{state.launchCount=registerLaunch(localStorage);state.onChange()}catch{}
 }
 return false; // Never replace App Open with a policy-violating launch/exit interstitial.
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
 try{
  await AdMob.showPrivacyOptionsForm();
  return true;
 }catch(error){
  // A missing/unpublished publisher message is an account issue. Keep its
  // details in developer logs only; give consumers a useful, localised notice.
  status('Privacy options unavailable',String(error?.message||error));
  const notice={
   en:'Privacy options are temporarily unavailable. Please try again later.',
   fr:'Les options de confidentialité sont momentanément indisponibles. Veuillez réessayer plus tard.',
   ar:'خيارات الخصوصية ما متوفراش دابا. عاود المحاولة من بعد.'
  };
  state.notify(notice[state.getLanguage()]||notice.en,true);
  return false;
 }
}
