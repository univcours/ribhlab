// Only tools with a real local implementation are shown.
// Feature-specific labels are translated independently of legacy PDF workspace text.
export const toolGroups=[
 {id:'scan',entries:['idcard','idPhotoMaker','scanCode','ocr','bookScan','slideScan','whiteboard','timestamp']},
 {id:'import',entries:['importImages','importFiles']},
 {id:'convert',entries:['toWord','toExcel','toCSV','toPpt','pdfLong','pdftoimages','images','extractText']},
 {id:'edit',entries:['sign','watermark','enhance','restorePhoto','manualErase','merge','bundle','split','reorder','managePages','rotate','compress','metadata','numbers','text','delete']},
 {id:'utilities',entries:['peerTransfer','shareFiles','printPdf']}
];
export const hubSpecial={
 idcard:{icon:'idcard',color:'green',type:'idcard'},
 idPhotoMaker:{icon:'user',color:'sky',type:'idPhoto'},
 scanCode:{icon:'scan',color:'blue',type:'barcode'},
 bookScan:{icon:'file',color:'sky',type:'scan'},
 slideScan:{icon:'image',color:'pink',type:'scan'},
 whiteboard:{icon:'image',color:'green',type:'photo',preset:'whiteboard'},
 timestamp:{icon:'clock',color:'blue',type:'photo',preset:'timestamp'},
 importImages:{icon:'image',color:'green',type:'import',kind:'image'},
 importFiles:{icon:'folder',color:'sky',type:'import',kind:'file'},
 toWord:{icon:'file',color:'blue',type:'export',format:'word'},
 toExcel:{icon:'file',color:'green',type:'export',format:'xlsx'},
 toCSV:{icon:'file',color:'green',type:'export',format:'csv'},
 toPpt:{icon:'image',color:'pink',type:'export',format:'pptx'},
 pdfLong:{icon:'image',color:'sky',type:'export',format:'long'},
 enhance:{icon:'image',color:'green',type:'photo',preset:'enhance'},
 restorePhoto:{icon:'image',color:'sky',type:'photo',preset:'restore'},
 manualErase:{icon:'delete',color:'green',type:'photo',preset:'eraser'},
 managePages:{icon:'reorder',color:'blue',type:'pageManager'},
 printPdf:{icon:'file',color:'sky',type:'libraryPrint'}
};
const groups={
 en:['Scan','Import','Convert','Edit','Utilities'],
 ar:['المسح','الاستيراد','التحويل','التعديل','أدوات إضافية'],
 fr:['Scanner','Importer','Convertir','Modifier','Utilitaires'],
 es:['Escanear','Importar','Convertir','Editar','Utilidades'],
 de:['Scannen','Importieren','Konvertieren','Bearbeiten','Dienstprogramme'],
 pt:['Digitalizar','Importar','Converter','Editar','Utilitários'],
 it:['Scansione','Importa','Converti','Modifica','Utilità']
};
const labels={
 idPhotoMaker:['ID Photo Sheet (print)','صور شخصية للطباعة','Planche photos identité','Hoja fotos de carné','Passfoto-Bogen','Folha fotos de identificação','Foglio fototessere'],
 scanCode:['Scan QR & Barcode','قراءة QR والباركود','Lire QR et code-barres','Leer QR y código','QR / Barcode lesen','Ler QR e código','Leggi QR e barcode'],
 idcard:['ID Cards','البطاقة الوطنية',"Cartes d’identité",'Documentos de identidad','Ausweise','Cartões de identidade','Carte d’identità'],
 bookScan:['Book Scan','مسح الكتب','Numériser un livre','Escanear libro','Buch scannen','Digitalizar livro','Scansiona libro'],
 slideScan:['Slides Scan','مسح العروض','Scanner des diapositives','Escanear diapositivas','Folien scannen','Digitalizar slides','Scansione slide'],
 whiteboard:['Whiteboard Enhance','تحسين السبورة','Améliorer tableau blanc','Mejorar pizarra','Whiteboard verbessern','Melhorar quadro','Migliora lavagna'],
 timestamp:['Timestamp','إضافة التاريخ والساعة','Horodatage','Fecha y hora','Zeitstempel','Data e hora','Data e ora'],
 importImages:['Import Images','استيراد الصور','Importer images','Importar imágenes','Bilder importieren','Importar imagens','Importa immagini'],
 importFiles:['Import Files','استيراد الملفات','Importer fichiers','Importar archivos','Dateien importieren','Importar ficheiros','Importa file'],
 toWord:['To Word (OCR)','تحويل إلى Word','Vers Word (OCR)','A Word (OCR)','Nach Word (OCR)','Para Word (OCR)','In Word (OCR)'],
 toExcel:['To Excel (.xlsx)','إلى Excel قابل للتعديل','Vers Excel (.xlsx)','A Excel (.xlsx)','Nach Excel (.xlsx)','Para Excel (.xlsx)','In Excel (.xlsx)'],
 toCSV:['To CSV (text)','تحويل إلى Excel (CSV)','Vers Excel (CSV)','A Excel (CSV)','Nach Excel (CSV)','Para Excel (CSV)','In Excel (CSV)'],
 toPpt:['To PPT (image slides)','تحويل إلى PowerPoint','Vers PPT (images)','A PPT (imágenes)','Nach PPT (Bilder)','Para PPT (imagens)','In PPT (immagini)'],
 pdfLong:['PDF to Long Image','PDF إلى صورة طويلة','PDF en longue image','PDF a imagen larga','PDF als langes Bild','PDF em imagem longa','PDF in immagine lunga'],
 restorePhoto:['Restore Photo (denoise)','ترميم الصورة وإزالة التشويش','Restaurer photo (débruitage)','Restaurar foto (ruido)','Foto entrauschen','Restaurar foto (ruído)','Restauro foto (rumore)'],
 enhance:['Restore / Enhance Photo','تحسين الصور','Améliorer photo','Mejorar foto','Foto verbessern','Melhorar foto','Migliora foto'],
 manualErase:['Erase with Brush','ممحاة يدوية','Effacer au pinceau','Borrar con pincel','Mit Pinsel löschen','Apagar com pincel','Cancella con pennello'],
 managePages:['Manage Pages','إدارة الصفحات','Gérer les pages','Gestionar páginas','Seiten verwalten','Gerir páginas','Gestisci pagine'],
 printPdf:['Print PDF','طباعة PDF','Imprimer PDF','Imprimir PDF','PDF drucken','Imprimir PDF','Stampa PDF']
};
const langIndex={en:0,ar:1,fr:2,es:3,de:4,pt:5,it:6};
export function hubGroupLabel(lang,id){const idx=langIndex[lang]??0;return groups[lang]?.[toolGroups.findIndex(x=>x.id===id)]||groups.en[toolGroups.findIndex(x=>x.id===id)]||id}
export function hubLabel(lang,id,fallback){const values=labels[id];return values?.[langIndex[lang]??0]||fallback||id}
export function hubLanguages(){return Object.keys(langIndex)}
