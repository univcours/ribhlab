/**
 * Dense, single-entry tools replacing duplicated standalone tile workflows.
 * The options still route to their original, tested implementations.
 */
export const mergedToolDefinitions=Object.freeze({
 convertDocument:{
  choices:['toWord','toWordTables','toExcel','toCSV','toPptEditable','toPpt','images','pdftoimages','pdfLong','extractText'],
  title:{en:'Convert document',ar:'تحويل الوثائق',fr:'Convertir le document',es:'Convertir documento',de:'Dokument konvertieren',pt:'Converter documento',it:'Converti documento'},
  help:{en:'Choose an output format, then select your file.',ar:'اختار الصيغة، ومن بعد اختار الملف.',fr:'Choisissez le format, puis le fichier.',es:'Elige un formato y luego selecciona el archivo.',de:'Wählen Sie ein Format und dann Ihre Datei.',pt:'Escolha o formato e depois o ficheiro.',it:'Scegli il formato e poi il file.'}
 },
 annotatePdf:{
  choices:['sign','watermark','text','numbers'],
  title:{en:'Write & sign PDF',ar:'الكتابة والتوقيع على PDF',fr:'Écrire et signer PDF',es:'Anotar PDF',de:'PDF beschriften',pt:'Anotar PDF',it:'Annota PDF'},
  help:{en:'Signature, watermark, page numbering and text in one place.',ar:'التوقيع والعلامة المائية وترقيم الصفحات والكتابة فبلاصة وحدة.',fr:'Signature, filigrane, numérotation et texte au même endroit.',es:'Firma, marca de agua, numeración y texto en un solo lugar.',de:'Signatur, Wasserzeichen, Seitennummern und Text an einem Ort.',pt:'Assinatura, marca de água, paginação e texto no mesmo lugar.',it:'Firma, filigrana, numerazione e testo in un unico posto.'}
 },
 pdfPrivacy:{
  choices:['lockPdf','metadata'],
  title:{en:'PDF privacy',ar:'حماية وخصوصية PDF',fr:'Confidentialité PDF',es:'Privacidad PDF',de:'PDF Datenschutz',pt:'Privacidade PDF',it:'Privacy PDF'},
  help:{en:'Password-protect a PDF or clean its metadata.',ar:'حمي PDF بكلمة السر أو حيّد المعلومات الخفية.',fr:'Protégez par mot de passe ou effacez les métadonnées.',es:'Protege con contraseña o borra metadatos.',de:'Mit Passwort schützen oder Metadaten löschen.',pt:'Proteja com palavra-passe ou remova metadados.',it:'Proteggi con password o rimuovi i metadati.'}
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
const localizedOptionWords={
 es:{toWord:'Word — texto OCR',toWordTables:'Word — tablas editables',toExcel:'Excel — XLSX',toCSV:'Hoja de cálculo — CSV',toPptEditable:'PowerPoint — texto editable',toPpt:'PowerPoint — diapositivas como imágenes',images:'Imágenes → PDF',pdftoimages:'PDF → Imágenes',pdfLong:'PDF → imagen larga',extractText:'PDF → TXT',sign:'Añadir firma',watermark:'Añadir marca de agua',text:'Añadir texto',numbers:'Numerar páginas',lockPdf:'Proteger PDF (AES-256)',metadata:'Borrar metadatos'},
 de:{toWord:'Word — OCR-Text',toWordTables:'Word — bearbeitbare Tabellen',toExcel:'Excel — XLSX',toCSV:'Tabelle — CSV',toPptEditable:'PowerPoint — bearbeitbarer Text',toPpt:'PowerPoint — Bildfolien',images:'Bilder → PDF',pdftoimages:'PDF → Bilder',pdfLong:'PDF → langes Bild',extractText:'PDF → TXT',sign:'Unterschrift hinzufügen',watermark:'Wasserzeichen hinzufügen',text:'Text hinzufügen',numbers:'Seiten nummerieren',lockPdf:'PDF schützen (AES-256)',metadata:'Metadaten entfernen'},
 pt:{toWord:'Word — texto OCR',toWordTables:'Word — tabelas editáveis',toExcel:'Excel — XLSX',toCSV:'Folha de cálculo — CSV',toPptEditable:'PowerPoint — texto editável',toPpt:'PowerPoint — diapositivos com imagens',images:'Imagens → PDF',pdftoimages:'PDF → Imagens',pdfLong:'PDF → imagem longa',extractText:'PDF → TXT',sign:'Adicionar assinatura',watermark:'Adicionar marca de água',text:'Adicionar texto',numbers:'Numerar páginas',lockPdf:'Proteger PDF (AES-256)',metadata:'Remover metadados'},
 it:{toWord:'Word — testo OCR',toWordTables:'Word — tabelle modificabili',toExcel:'Excel — XLSX',toCSV:'Foglio di calcolo — CSV',toPptEditable:'PowerPoint — testo modificabile',toPpt:'PowerPoint — diapositive immagini',images:'Immagini → PDF',pdftoimages:'PDF → Immagini',pdfLong:'PDF → immagine lunga',extractText:'PDF → TXT',sign:'Aggiungi firma',watermark:'Aggiungi filigrana',text:'Aggiungi testo',numbers:'Numera pagine',lockPdf:'Proteggi PDF (AES-256)',metadata:'Rimuovi metadati'}
};
const fallback=(translations,language)=>translations?.[language]||translations?.en||'';
export function mergedToolOptions(id,language='en'){
 const definition=mergedToolDefinitions[id];
 if(!definition)throw Error('Unknown tool group: '+id);
 return definition.choices.map(action=>({
  action,label:localizedOptionWords[language]?.[action]||fallback(optionWords[action],language)
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
 close.dataset.mergedClose='true';close.setAttribute('aria-label',fallback({ar:'إغلاق',fr:'Fermer',en:'Close',es:'Cerrar',de:'Schließen',pt:'Fechar',it:'Chiudi'},language));
 header.append(title,close);
 const info=document.createElement('p');info.textContent=fallback(def.help,language);
 const form=document.createElement('form');
 const label=document.createElement('label');label.textContent=fallback({ar:'اختار العملية',fr:'Choisir une opération',en:'Choose action',es:'Elegir acción',de:'Aktion wählen',pt:'Escolher ação',it:'Scegli azione'},language);
 const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);
 for(const choice of mergedToolOptions(id,language)){
  const option=document.createElement('option');option.value=choice.action;option.textContent=choice.label;
  select.append(option);
 }
 label.append(select);
 const go=document.createElement('button');go.type='submit';go.className='rivo-merged-start';
 go.textContent=fallback({ar:'متابعة',fr:'Continuer',en:'Continue',es:'Continuar',de:'Weiter',pt:'Continuar',it:'Continua'},language);
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
  try{Promise.resolve(onChoose(action)).catch(onError)}catch(error){onError(error)}
 });
 document.addEventListener('keydown',escape);
 select.focus();
 return dismiss;
}
