/** AdMob banner diagnosis from actual SDK state, NOT simulated inventory.
 * 'DISPLAYED' means SDK loaded + layout expected visible; an emulator/device
 * screenshot or AdMob impression event is required to confirm real visibility.
 */
export const BANNER_STATUSES=Object.freeze([
 'NOT_INITIALIZED','INITIALIZED','CONSENT_PENDING','REQUESTING','LOADED','DISPLAYED',
 'NO_FILL','NETWORK_ERROR','SDK_ERROR','HIDDEN_BY_LAYOUT','PAUSED'
]);
export function classifyBannerError(error){
 const msg=String(error||'');
 if(!msg)return null;
 if(/no.?fill|no ad to show|code\s*[:=]?\s*3\b|error\s*3\b/i.test(msg))return 'NO_FILL';
 if(/network|connection|offline|timeout|socket|internet/i.test(msg))return 'NETWORK_ERROR';
 return 'SDK_ERROR';
}
export function describeBanner({
 android=false,enabled=false,initialized=false,consent=false,loading=false,
 loaded=false,hidden=false,foreground=true,layoutValid=true,layoutReason='',
 bannerError='',impressions=0
}={}){
 let status='NOT_INITIALIZED';
 if(!android||!enabled)status='NOT_INITIALIZED';
 else if(!consent)status='CONSENT_PENDING';
 else if(!initialized)status='NOT_INITIALIZED';
 else if(!foreground||hidden)status='PAUSED';
 else if(!layoutValid)status='HIDDEN_BY_LAYOUT';
 else if(loading)status='REQUESTING';
 else if(loaded)status='DISPLAYED';
 else status=classifyBannerError(bannerError)||'INITIALIZED';
 return Object.freeze({
  status,layoutValid:!!layoutValid,layoutReason:String(layoutReason||''),
  error:String(bannerError||''),loaded:!!loaded,
  sdkExpectedVisible:status==='DISPLAYED', // not a physical display assertion
  impressions:Number(impressions)||0,
  verifiedOnDevice:false
 });
}
