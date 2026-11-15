/** Native AdMob overlay geometry, Android logical dp.
 * Native banners draw above WebView; the WebView must be clipped and scrolled
 * within a content viewport ending BEFORE the native Google creative.
 */
export const AD_WIDTH=320,AD_HEIGHT=50,AD_NAV_GAP=8,AD_CONTENT_GAP=8;
export function calculateAdLayout({viewportWidth,viewportHeight,navTop=null,navBottom=null,headerBottom=70}={}){
 const w=Number(viewportWidth),h=Number(viewportHeight),header=Number(headerBottom);
 if(!Number.isFinite(w)||w<AD_WIDTH||!Number.isFinite(h)||h<230||!Number.isFinite(header)||header<0)
  return {valid:false,reason:'Insufficient viewport'};
 let margin=AD_NAV_GAP,hasNav=false;
 if(navTop!==null&&navBottom!==null){
  const top=Number(navTop),bottom=Number(navBottom);
  if(!Number.isFinite(top)||!Number.isFinite(bottom)||top<0||top>bottom||bottom>h+3)
   return {valid:false,reason:'Navigation geometry invalid'};
  if(top>h-40)return {valid:false,reason:'Navigation not laid out'};
  margin=Math.ceil(h-top)+AD_NAV_GAP;hasNav=true;
 }
 const bannerTop=h-margin-AD_HEIGHT,clipBottom=margin+AD_HEIGHT+AD_CONTENT_GAP;
 if(bannerTop<header+96)return {valid:false,reason:'No safe room for content and ad'};
 return {valid:true,margin,bannerTop,bannerBottom:bannerTop+AD_HEIGHT,
  contentTop:Math.ceil(header),contentBottom:clipBottom,
  bottomWithoutAd:hasNav?Math.ceil(h-Number(navTop))+AD_NAV_GAP:AD_NAV_GAP,
  width:AD_WIDTH,height:AD_HEIGHT,left:(w-AD_WIDTH)/2,hasNav};
}
export function nativeAdFits(size){
 const w=Number(size?.width??0),h=Number(size?.height??0);
 return Number.isFinite(w)&&Number.isFinite(h)&&w>=0&&h>=0&&w<=322&&h<=52;
}
