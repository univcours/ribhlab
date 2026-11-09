/**
 * Dense, single-entry tools replacing duplicated standalone tile workflows.
 * The options still route to their original, tested implementations.
 */
export const mergedToolDefinitions=Object.freeze({
 convertDocument:{
  choices:['toWord','toWordTables','toExcel','toCSV','toPptEditable','toPpt','images','pdftoimages','pdfLong','extractText'],
  title:{en:'Convert document',ar:'تحويل الوثائق',fr:'Convertir le document',es:'Convertir documento',de:'Dokument konvertieren',pt:'Converter documento',it:'Converti documento'},
  help:{en:'Choose an output format, then select your file.',ar:'اختار الصيغة، ومن بعد اختار الملف.',fr:'Choisissez le format, puis le fichier.'}
 },
 annotatePdf:{
  choices:['sign','watermark','text','numbers'],
  title:{en:'Write & sign PDF',ar:'الكتابة والتوقيع على PDF',fr:'Écrire et signer PDF',es:'Anotar PDF',de:'PDF beschriften',pt:'Anotar PDF',it:'Annota PDF'},
  help:{en:'Signature, watermark, page numbering and text in one place.',ar:'التوقيع والعلامة المائية وترقيم الصفحات والكتابة فبلاصة وحدة.',fr:'Signature, filigrane, numérotation et texte au même endroit.'}
 },
 pdfPrivacy:{
  choices:['lockPdf','metadata'],
  title:{en:'PDF privacy',ar:'حماية وخصوصية PDF',fr:'Confidentialité PDF',es:'Privacidad PDF',de:'PDF Datenschutz',pt:'Privacidade PDF',it:'Privacy PDF'},
  help:{en:'Password-protect a PDF or clean its metadata.',ar:'حمي PDF بكلمة السر أو حيّد المعلومات الخفية.',fr:'Protégez par mot de passe ou effacez les métadonnées.'}
 }
});
const optionWords={
 toWord:{en:'Word — OCR text',ar:'Word — استخراج النص',fr:'Word — texte OCR'},
 toWordTables:{en:'Word — editable tables',ar:'Word — جداول قابلة للتعديل',fr:'Word — tableaux modifiables'},
 toExcel:{en:'Excel — XLSX',ar:'Excel — XLSX',fr:'Excel — XLSX'},
 toCSV:{en:'Spreadsheet — CSV',ar:'جداول — CSV',fr:'Tableur — CSV'},
 toPptEditable:{en:'PowerPoint — editable text',ar:'PowerPoint — كتابة قابلة للتعديل',fr:'PowerPoint — texte modifiable'},
 toPpt:{en:'PowerPoint — image slides',ar:'PowerPoint — شرائح صور',fr:'PowerPoint — images'},
 images:{en:'Images → PDF',ar:'صور → PDF',fr:'Images → PDF'},
 pdftoimages:{en:'PDF → Images',ar:'PDF → صور',fr:'PDF → Images'},
 pdfLong:{en:'PDF → long image',ar:'PDF → صورة طويلة',fr:'PDF → image longue'},
 extractText:{en:'PDF → TXT',ar:'PDF → TXT',fr:'PDF → TXT'},
 sign:{en:'Add signature',ar:'إضافة توقيع',fr:'Signer'},
 watermark:{en:'Add watermark',ar:'إضافة علامة مائية',fr:'Filigrane'},
 text:{en:'Add text',ar:'إضافة كتابة',fr:'Ajouter du texte'},
 numbers:{en:'Number pages',ar:'ترقيم الصفحات',fr:'Numéroter les pages'},
 lockPdf:{en:'Lock PDF (AES-256)',ar:'حماية PDF بكلمة سر',fr:'Protéger PDF (AES-256)'},
 metadata:{en:'Clear metadata',ar:'حذف المعلومات الخفية',fr:'Supprimer les métadonnées'}
};
const fallback=(translations,language)=>translations?.[language]||translations?.en||'';
export function mergedToolOptions(id,language='en'){
 const definition=mergedToolDefinitions[id];
 if(!definition)throw Error('Unknown tool group: '+id);
 return definition.choices.map(action=>({
  action,label:fallback(optionWords[action],language)
 }));
}
export function openMergedToolDialog({id,language='en',onChoose,onError=console.warn}={}){
 const def=mergedToolDefinitions[id];
 if(!def||typeof onChoose!=='function')throw Error('Invalid grouped tool');
 // Avoid stacking duplicate modal surfaces if tapped repeatedly.
 const existing=document.querySelector('.rivo-merged-overlay');
 if(existing)existing.querySelector('[data-merged-close]')?.click();
 const screen=document.createElement('div');
 screen.className='rivo-merged-overlay';
 screen.dir=language==='ar'?'rtl':'ltr';
 const dialog=document.createElement('section');
 dialog.className='rivo-merged-dialog';
 dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label',fallback(def.title,language));
 const header=document.createElement('header');
 const title=document.createElement('strong');title.textContent=fallback(def.title,language);
 const close=document.createElement('button');close.type='button';close.textContent='✕';
 close.dataset.mergedClose='true';close.setAttribute('aria-label',fallback({ar:'إغلاق',fr:'Fermer',en:'Close'},language));
 header.append(title,close);
 const info=document.createElement('p');info.textContent=fallback(def.help,language);
 const form=document.createElement('form');
 const label=document.createElement('label');label.textContent=fallback({ar:'اختار العملية',fr:'Choisir une opération',en:'Choose action'},language);
 const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);
 for(const choice of mergedToolOptions(id,language)){
  const option=document.createElement('option');option.value=choice.action;option.textContent=choice.label;
  select.append(option);
 }
 label.append(select);
 const go=document.createElement('button');go.type='submit';go.className='rivo-merged-start';
 go.textContent=fallback({ar:'متابعة',fr:'Continuer',en:'Continue'},language);
 form.append(label,go);
 dialog.append(header,info,form);screen.append(dialog);
 document.body.append(screen);
 let closed=false;
 const escape=e=>{if(e.key==='Escape'||e.key==='Backspace'&&e.target!==select){e.preventDefault();dismiss()}};
 const dismiss=()=>{
  if(closed)return;
  closed=true;document.removeEventListener('keydown',escape);screen.remove();
 };
 close.addEventListener('click',dismiss);
 screen.addEventListener('click',e=>{if(e.target===screen)dismiss()});
 form.addEventListener('submit',e=>{
  e.preventDefault();
  if(closed)return;
  const action=select.value;
  if(!def.choices.includes(action))return;
  dismiss();
  // Calls the underlying implemented action, preserving its file picker,
  // processing and save semantics instead of inventing another converter.
  Promise.resolve().then(()=>onChoose(action)).catch(onError);
 });
 document.addEventListener('keydown',escape);
 return dismiss;
}
