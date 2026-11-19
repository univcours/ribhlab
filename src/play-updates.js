// RivoScan native Google Play immediate updates (no external APK downloads).
import {Capacitor,registerPlugin} from '@capacitor/core';
const NativePlayUpdate=registerPlugin('RivoPlayUpdate');
const android=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
let checking=null,lastCheck=0,installedPrompt=false;
// Android WebView provides navigator.onLine; offline is never an update requirement.
export function playUpdateOnline(navigatorLike=globalThis.navigator){return navigatorLike?.onLine!==false;}
if(typeof window!=='undefined')window.addEventListener('offline',()=>clearPrompt());
const labels={
 en:{title:'RivoScan update available',body:'A newer version is available on Google Play. Connect to the internet to install it.',update:'Update with Google Play',exit:'Later',retry:'Try again',unavailable:'Google Play update is not available right now.'},
 ar:{title:'تحديث جديد لـ RivoScan',body:'كاين إصدار جديد فـ Google Play. خاص الإنترنت باش يتثبت التحديث.',update:'التحديث عبر Google Play',exit:'من بعد',retry:'عاود المحاولة',unavailable:'التحديث ما متاحش دابا فـ Google Play.'},
 fr:{title:'Mise à jour RivoScan disponible',body:'Une nouvelle version est disponible sur Google Play. Une connexion Internet est nécessaire.',update:'Mettre à jour',exit:'Plus tard',retry:'Réessayer',unavailable:'Mise à jour Google Play indisponible pour le moment.'},
 es:{title:'Actualización de RivoScan disponible',body:'Hay una versión nueva en Google Play. Conéctate a Internet para actualizar.',update:'Actualizar con Google Play',exit:'Más tarde',retry:'Reintentar',unavailable:'La actualización de Google Play no está disponible ahora.'},
 de:{title:'RivoScan-Update verfügbar',body:'Eine neue Version ist bei Google Play verfügbar. Für das Update ist Internet erforderlich.',update:'Mit Google Play aktualisieren',exit:'Später',retry:'Erneut versuchen',unavailable:'Das Google Play-Update ist derzeit nicht verfügbar.'},
 pt:{title:'Atualização do RivoScan disponível',body:'Existe uma nova versão no Google Play. É necessária ligação à Internet para atualizar.',update:'Atualizar pelo Google Play',exit:'Mais tarde',retry:'Tentar novamente',unavailable:'A atualização do Google Play não está disponível neste momento.'},
 it:{title:'Aggiornamento RivoScan disponibile',body:'Una nuova versione è disponibile su Google Play. Serve Internet per aggiornarla.',update:'Aggiorna con Google Play',exit:'Più tardi',retry:'Riprova',unavailable:'L’aggiornamento di Google Play non è disponibile al momento.'}
};
function getCopy(language){return labels[language]||labels.en}
function clearPrompt(){document.querySelector('[data-rivo-update-gate]')?.remove();installedPrompt=false}
function renderPrompt(language,onClose){
 const old=document.querySelector('[data-rivo-update-gate]');
 if(old)return;
 const copy=getCopy(language),overlay=document.createElement('div');
 overlay.dataset.rivoUpdateGate='true';overlay.className='rivo-update-gate';
 const dialog=document.createElement('section');dialog.className='rivo-update-dialog';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label',copy.title);
 const h=document.createElement('h2');h.textContent=copy.title;
 const p=document.createElement('p');p.textContent=copy.body;
 const error=document.createElement('p');error.className='rivo-update-error';error.setAttribute('role','status');
 const update=document.createElement('button');update.type='button';update.textContent=copy.update;
 const quit=document.createElement('button');quit.type='button';quit.textContent=copy.exit;quit.className='rivo-update-close';
 const run=async()=>{
  if(!playUpdateOnline()){clearPrompt();return;}
  update.disabled=true;
  error.textContent='';
  try{
   const result=await NativePlayUpdate.install();
   if(!result?.started){
    error.textContent=copy.unavailable;
    if(!playUpdateOnline()){clearPrompt();return;}
    const state=await NativePlayUpdate.check();
    if(!state.available||!state.allowed){clearPrompt();return}
   }
  }catch(e){if(!playUpdateOnline()){clearPrompt();return;}
   error.textContent=String(e?.message||e)}
  finally{update.disabled=false}
 };
 update.addEventListener('click',run);
 quit.addEventListener('click',()=>clearPrompt());
 dialog.append(h,p,error,update,quit);overlay.append(dialog);
 // Always permit continuing on the installed version. Offline users never see this prompt.
 document.body.append(overlay);installedPrompt=true;update.focus();
 // The update starts ONLY after the user taps the Google Play update button.
}
export async function checkPlayUpdate({language='en',onClose=()=>{},force=false,working=false}={}){
 if(!android||working||typeof document==='undefined')return false;
 if(!playUpdateOnline()){clearPrompt();return false;}
 if(installedPrompt)return true;
 if(checking)return checking;
 if(!force&&Date.now()-lastCheck<5*60*1000)return false;
 lastCheck=Date.now();
 checking=(async()=>{
  try{
   const info=await NativePlayUpdate.check();
   if(!playUpdateOnline()){clearPrompt();return false;}
   if(info?.available&&info?.allowed){renderPrompt(language,onClose);return true}
   clearPrompt();return false;
  }catch(e){if(!playUpdateOnline())clearPrompt();
   console.warn('Play update check unavailable:',String(e?.message||e));return false}
  finally{checking=null}
 })();
 return checking;
}
