// Original RivoScan scanner-first interface, with links to implemented actions.
export const quickScanActions=Object.freeze([
 {id:'document',icon:'camera',attribute:'data-live-camera'},
 {id:'id',icon:'idcard',attribute:'data-id-card-scan'},
 {id:'book',icon:'book',attribute:'data-hub-action="bookScan"',ad:true},
 {id:'gallery',icon:'image',attribute:'data-import="image"'}
]);
const translations={
 en:['Quick scan','Choose a scan mode','Recent documents','All documents','PDF','Images','More tools','Edit, OCR, organize and convert','Document','ID card','Book','Gallery','Saved on this device'],
 ar:['المسح السريع','اختار طريقة التصوير','آخر الوثائق','كل الوثائق','PDF','الصور','أدوات إضافية','تعديل وOCR وتنظيم وتحويل','وثيقة','البطاقة','كتاب','المعرض','محفوظة فالهاتف'],
 fr:['Scan rapide','Choisissez un mode','Documents récents','Tous les documents','PDF','Images','Autres outils','Modifier, OCR, organiser et convertir','Document','Identité','Livre','Galerie','Enregistrés sur l’appareil'],
 es:['Escaneo rápido','Elige un modo','Documentos recientes','Todos los documentos','PDF','Imágenes','Más herramientas','Editar, OCR, organizar y convertir','Documento','Identidad','Libro','Galería','Guardados en tu dispositivo'],
 de:['Schnellscan','Scan-Modus wählen','Letzte Dokumente','Alle Dokumente','PDF','Bilder','Weitere Werkzeuge','Bearbeiten, OCR, ordnen und konvertieren','Dokument','Ausweis','Buch','Galerie','Auf dem Gerät gespeichert'],
 pt:['Digitalização rápida','Escolha um modo','Documentos recentes','Todos os documentos','PDF','Imagens','Mais ferramentas','Editar, OCR, organizar e converter','Documento','Identidade','Livro','Galeria','Guardados no dispositivo'],
 it:['Scansione rapida','Scegli la modalità','Documenti recenti','Tutti i documenti','PDF','Immagini','Altri strumenti','Modifica, OCR, organizza e converti','Documento','Identità','Libro','Galleria','Salvati sul dispositivo']
};
const keys=['quick','quickSub','recent','all','pdf','images','more','moreSub','document','id','book','gallery','saved'];
export function scanHomeCopy(language='en'){
 const source=translations[language]||translations.en;
 return Object.fromEntries(keys.map((k,i)=>[k,source[i]]));
}
export function documentCategoryCounts(items,visualFileType){
 return (Array.isArray(items)?items:[]).reduce((out,item)=>{
  out.all++;
  const kind=visualFileType(item).klass;
  if(kind==='pdf')out.pdf++;
  if(kind==='image')out.images++;
  return out;
 },{all:0,pdf:0,images:0});
}
