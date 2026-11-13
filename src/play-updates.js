// RivoScan native Google Play immediate updates (no external APK downloads).
import {Capacitor,registerPlugin} from '@capacitor/core';
const NativePlayUpdate=registerPlugin('RivoPlayUpdate');
const android=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
let checking=null,lastCheck=0,installedPrompt=false;
const labels={
 en:{title:'RivoScan update required',body:'A newer version is available on Google Play. Update to keep using the latest version of RivoScan.',update:'Update with Google Play',exit:'Close app',retry:'Try again'},
 ar:{title:'تحديث RivoScan ضروري',body:'كاين تحديث جديد فـGoogle Play. حدّث التطبيق باش تستعمل النسخة الجديدة.',update:'حدّث عبر Google Play',exit:'إغلاق التطبيق',retry:'عاود المحاولة'},
 fr:{title:'Mise à jour RivoScan nécessaire',body:'Une nouvelle version est disponible sur Google Play. Mettez à jour l’application pour continuer.',update:'Mettre à jour',exit:'Fermer',retry:'Réessayer'}
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
  update.disabled=true;
  error.textContent='';
  try{
   const result=await NativePlayUpdate.install();
   if(!result?.started){
    error.textContent='Google Play update is not available right now.';
    const state=await NativePlayUpdate.check();
    if(!state.available||!state.allowed){clearPrompt();return}
   }
  }catch(e){error.textContent=String(e?.message||e)}
  finally{update.disabled=false}
 };
 update.addEventListener('click',run);
 quit.addEventListener('click',()=>{if(typeof onClose==='function')onClose()});
 dialog.append(h,p,error,update,quit);overlay.append(dialog);
 // Don't close on outside-tap/Back: the Play update requires explicit action.
 document.body.append(overlay);installedPrompt=true;update.focus();
 void run();
}
export async function checkPlayUpdate({language='en',onClose=()=>{},force=false,working=false}={}){
 if(!android||working||typeof document==='undefined')return false;
 if(installedPrompt)return true;
 if(checking)return checking;
 if(!force&&Date.now()-lastCheck<5*60*1000)return false;
 lastCheck=Date.now();
 checking=(async()=>{
  try{
   const info=await NativePlayUpdate.check();
   if(info?.available&&info?.allowed){renderPrompt(language,onClose);return true}
   clearPrompt();return false;
  }catch(e){console.warn('Play update check unavailable:',String(e?.message||e));return false}
  finally{checking=null}
 })();
 return checking;
}
