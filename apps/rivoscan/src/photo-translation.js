import {recognize} from 'tesseract.js';
import {Translation} from '@capacitor-mlkit/translation';
import {Capacitor} from '@capacitor/core';

export const translationLanguages={
 ar:{label:'العربية',ocr:'ara'},en:{label:'English',ocr:'eng'},
 fr:{label:'Français',ocr:'fra'},es:{label:'Español',ocr:'spa'},
 de:{label:'Deutsch',ocr:'deu'},pt:{label:'Português',ocr:'por'},
 it:{label:'Italiano',ocr:'ita'}
};
const messages={
 en:['Photo Translation','Take photo','Choose photo','Source language','Target language','Extract text (OCR)','Translate offline','Recognized text — correct if needed','Translation result','Save text','Close','The OCR and ML Kit model files download once (Internet needed). Afterwards translation runs on the phone. Original photo is not uploaded. Translation quality varies by language.','Android ML Kit translation is only available in the installed Android app.','No text was recognized. Try a clearer picture.','Choose two different languages.'],
 ar:['ترجمة صورة','تصوير','اختيار صورة','لغة النص الأصلي','اللغة المطلوبة','استخراج الكتابة OCR','الترجمة على الهاتف','النص المقروء — صححو إذا احتاج','نتيجة الترجمة','حفظ النص','إغلاق','ملفات OCR والترجمة كتتحمّل أول مرة بالإنترنت، ومن بعد الخدمة محلية فالهاتف. الصورة ما كتطلعش للخادم. الجودة كتختلف حسب اللغة.','الترجمة كتخدم فتطبيق Android المثبت فقط.','ما تعرفناش على الكتابة. جرب صورة أوضح.','اختار جوج لغات مختلفين.'],
 fr:['Traduction photo','Photographier','Choisir photo','Langue source','Langue cible','Reconnaître le texte (OCR)','Traduire hors ligne','Texte reconnu — corriger si besoin','Traduction','Enregistrer texte','Fermer','Les modèles OCR et ML Kit sont téléchargés à la première utilisation. Ensuite le traitement est local. La photo n’est pas envoyée.','Disponible uniquement dans l’application Android.','Aucun texte détecté.','Choisissez deux langues différentes.'],
 es:['Traducir foto','Fotografiar','Elegir foto','Idioma original','Idioma destino','Reconocer texto OCR','Traducir localmente','Texto reconocido','Traducción','Guardar texto','Cerrar','Los modelos se descargan al primer uso; después funcionan localmente. No se sube la imagen.','Solo en Android.','Sin texto reconocido.','Elige idiomas diferentes.'],
 de:['Foto übersetzen','Foto aufnehmen','Bild wählen','Ausgangssprache','Zielsprache','Text erkennen','Offline übersetzen','Erkannter Text','Übersetzung','Text speichern','Schließen','Sprachmodelle werden beim ersten Mal geladen, danach läuft alles lokal. Fotos werden nicht hochgeladen.','Nur in Android-App.','Kein Text erkannt.','Andere Zielsprache wählen.'],
 pt:['Traduzir foto','Fotografar','Escolher foto','Idioma de origem','Idioma alvo','Reconhecer texto OCR','Traduzir offline','Texto reconhecido','Tradução','Guardar texto','Fechar','Os modelos são descarregados na primeira utilização; depois funciona no aparelho.','Só na app Android.','Sem texto reconhecido.','Escolha idiomas diferentes.'],
 it:['Traduci foto','Fotografa','Scegli foto','Lingua originale','Lingua destinazione','Riconosci testo OCR','Traduci offline','Testo riconosciuto','Traduzione','Salva testo','Chiudi','I modelli si scaricano al primo utilizzo, poi tutto avviene sul telefono.','Solo app Android.','Nessun testo rilevato.','Scegli due lingue diverse.']
};
export function validateTranslationPair(source,target){
 if(!translationLanguages[source]||!translationLanguages[target])throw Error('Unsupported translation language');
 if(source===target)throw Error('Source and target languages must differ');
 return {sourceLanguage:source,targetLanguage:target};
}
function labeledControl(panel,label,control){
 const row=document.createElement('label');row.className='rivo-id-row';row.textContent=label;row.append(control);panel.append(row);return control;
}
function selectLang(value){
 const select=document.createElement('select');
 for(const [lang,data] of Object.entries(translationLanguages)){
  const option=document.createElement('option');option.value=lang;option.textContent=data.label;select.append(option);
 }
 select.value=value;return select;
}
export function openPhotoTranslation({language='en',capture,save,notify=()=>{}}={}){
 const L=messages[language]||messages.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay';
 const panel=document.createElement('section');panel.className='rivo-code-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const actionRow=document.createElement('div');actionRow.className='rivo-code-actions';panel.append(actionRow);
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;panel.append(input);
 const source=labeledControl(panel,L[3],selectLang('en'));
 const target=labeledControl(panel,L[4],selectLang(language==='en'?'fr':language));
 const original=labeledControl(panel,L[7],document.createElement('textarea'));original.rows=5;original.placeholder=L[7];
 const translation=labeledControl(panel,L[8],document.createElement('textarea'));translation.rows=5;translation.readOnly=true;
 const notice=document.createElement('p');notice.className='rivo-code-help';notice.textContent=L[11];panel.append(notice);
 const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
 const resultActions=document.createElement('div');resultActions.className='rivo-code-actions';panel.append(resultActions);
 let file=null,closed=false,busy=false,hasRecognition=false;
 const close=()=>{if(busy)return;closed=true;overlay.remove();input.value='';file=null};
 const button=(parent,label,fn)=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.addEventListener('click',fn);parent.append(b);return b;
 };
 const setFile=next=>{file=next;original.value='';translation.value='';hasRecognition=false;status.textContent=file?.name||'';};
 button(actionRow,L[1],async()=>{
  if(busy||!capture)return;
  try{
   const photo=await capture();
   if(!photo)return;
   const response=await fetch(photo);
   if(!response.ok)throw Error('Camera photo could not be read');
   setFile(new File([await response.blob()],'RivoScan_Camera.jpg',{type:'image/jpeg'}));
  }catch(error){status.textContent=error?.message||String(error)}
 });
 button(actionRow,L[2],()=>input.click());
 input.addEventListener('change',()=>{const picked=input.files?.[0];if(picked)setFile(picked);input.value=''});
 button(resultActions,L[5],async()=>{
  if(busy||!file)return;
  busy=true;status.textContent=L[5]+' …';
  try{
   if(file.size>16*1024*1024)throw Error('Photo limit: 16 MB');
   const model=translationLanguages[source.value];
   const result=await recognize(file,model.ocr);
   if(closed)return;
   original.value=(result.data.text||'').trim();hasRecognition=Boolean(original.value);
   status.textContent=hasRecognition?L[7]:L[13];
  }catch(error){if(!closed)status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 button(resultActions,L[6],async()=>{
  if(busy)return;
  try{validateTranslationPair(source.value,target.value)}catch{status.textContent=L[14];return}
  if(!original.value.trim()){status.textContent=L[13];return}
  if(!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable('Translation')){
   status.textContent=L[12];return;
  }
  busy=true;status.textContent=L[6]+' …';
  try{
   // ML Kit translates text LOCALLY. Models are downloaded at first use.
   const result=await Translation.translate({
    text:original.value.slice(0,12000),
    sourceLanguage:source.value,targetLanguage:target.value
   });
   if(closed)return;
   translation.value=String(result.text||'');
   status.textContent=translation.value?L[8]:L[13];
  }catch(error){if(!closed)status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 button(resultActions,L[9],async()=>{
  if(!translation.value.trim()||busy)return;
  busy=true;
  try{
   const result='RivoScan Photo Translation\n'+
    translationLanguages[source.value].label+' → '+translationLanguages[target.value].label+
    '\n\n'+L[7]+'\n'+original.value+'\n\n'+L[8]+'\n'+translation.value;
   await save(new TextEncoder().encode(result),'RivoScan_Translation_'+Date.now()+'.txt','text/plain');
   if(!closed)notify(L[9]+' ✓');
  }catch(error){if(!closed)status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 button(resultActions,L[10],close);
 overlay.append(panel);document.body.append(overlay);
 return close;
}
