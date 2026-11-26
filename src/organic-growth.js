import {Capacitor,registerPlugin} from '@capacitor/core';
import {Share} from '@capacitor/share';
export const PLAY_URL='https://play.google.com/store/apps/details?id=com.ribhlab.rivoscan';
export const APPS_URL='https://ribhlab.github.io/apps/';
const key='rivo-organic-review-v1',day=86400000;
const copy={
 en:['Share RivoScan','More apps by RibhLab','View on Google Play','Scan documents and manage PDFs with RivoScan.'],
 fr:['Partager RivoScan','Autres applications RibhLab','Voir sur Google Play','Numérisez vos documents et organisez vos PDF avec RivoScan.'],
 ar:['شارك RivoScan','تطبيقات RibhLab الأخرى','عرض على Google Play','امسح المستندات ونظّم ملفات PDF باستعمال RivoScan.'],
 es:['Compartir RivoScan','Más apps de RibhLab','Ver en Google Play','Escanea documentos y organiza PDF con RivoScan.'],
 de:['RivoScan teilen','Weitere RibhLab-Apps','In Google Play ansehen','Scanne Dokumente und verwalte PDFs mit RivoScan.'],
 pt:['Compartilhar RivoScan','Mais apps RibhLab','Ver no Google Play','Digitalize documentos e organize PDFs com RivoScan.'],
 it:['Condividi RivoScan','Altre app RibhLab','Vedi su Google Play','Scansiona documenti e organizza PDF con RivoScan.']
};
export const growthCopy=lang=>copy[lang]||copy.en;
const native=registerPlugin('RivoPlayUpdate');
function load(storage){try{return JSON.parse(storage.getItem(key)||'{}')||{}}catch{return {}}}
export function recordGrowthSave(storage=localStorage,now=Date.now()){
 try{const s=load(storage);storage.setItem(key,JSON.stringify({...s,first:s.first||now,count:Math.min(10000,(Number(s.count)||0)+1)}));}catch{}
}
export function reviewEligible(s,now){return Number(s.count)>=3&&Number(s.first)>0&&now-Number(s.first)>=2*day&&(!s.attempt||now-Number(s.attempt)>=90*day);}
export async function maybeRequestOrganicReview({storage=localStorage,now=Date.now(),canShow=()=>true,runWithoutAds=fn=>fn()}={}){
 if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('RivoPlayUpdate')||!canShow())return false;
 const s=load(storage);if(!reviewEligible(s,now))return false;
 // No sentiment gate, reward, review detection or conditional access.
 // Reserve the attempt before invoking Play; the SDK may silently decline.
 try{storage.setItem(key,JSON.stringify({...s,attempt:now}));}catch{return false}
 try{await runWithoutAds(()=>native.requestOrganicReview());}catch{}
 return true;
}
export async function shareRivoApp(lang){
 const text=growthCopy(lang)[3];
 if(Capacitor.isNativePlatform())return Share.share({title:'RivoScan',text,url:PLAY_URL,dialogTitle:growthCopy(lang)[0]});
 if(navigator.share)return navigator.share({title:'RivoScan',text,url:PLAY_URL});
 await navigator.clipboard.writeText(PLAY_URL);
}
export async function openGrowthLink(kind){
 const url=kind==='apps'?APPS_URL:PLAY_URL;
 if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android')return native.openGrowthLink({kind});
 window.open(url,'_blank','noopener,noreferrer');
}
