// Only tools with a real local implementation are shown.
// Feature-specific labels are translated independently of legacy PDF workspace text.
export const toolGroups=[
 {id:'scan',entries:['idcard','idPhotoMaker','scanCode','photoTranslation','formulaOcr','ocr','bookScan','slideScan','whiteboard','timestamp']},
 {id:'import',entries:['importImages','importFiles']},
 {id:'convert',entries:['toWord','toWordTables','toExcel','toCSV','toPpt','toPptEditable','pdfLong','pdftoimages','images','extractText']},
 {id:'edit',entries:['sign','watermark','enhance','restorePhoto','manualErase','eraseColoredMarks','eraseLightWatermark','merge','bundle','split','reorder','managePages','rotate','lockPdf','compress','metadata','numbers','text','delete']},
 {id:'utilities',entries:['aiChat','solverAI','countCam','peerTransfer','shareFiles','printPdf']}
];
export const hubSpecial={
 idcard:{icon:'idcard',color:'green',type:'idcard'},
 idPhotoMaker:{icon:'user',color:'sky',type:'idPhoto'},
 scanCode:{icon:'scan',color:'blue',type:'barcode'},
 aiChat:{icon:'text',color:'violet',type:'aiDocument'},
 solverAI:{icon:'image',color:'blue',type:'aiSolver'},
 countCam:{icon:'camera',color:'green',type:'countCam'},
 lockPdf:{icon:'lock',color:'blue',type:'pdfLock'},
 photoTranslation:{icon:'text',color:'violet',type:'photoTranslation'},
 formulaOcr:{icon:'text',color:'blue',type:'formulaOcr'},
 bookScan:{icon:'file',color:'sky',type:'book'},
 slideScan:{icon:'image',color:'pink',type:'scan'},
 whiteboard:{icon:'image',color:'green',type:'photo',preset:'whiteboard'},
 timestamp:{icon:'clock',color:'blue',type:'photo',preset:'timestamp'},
 importImages:{icon:'image',color:'green',type:'import',kind:'image'},
 importFiles:{icon:'folder',color:'sky',type:'import',kind:'file'},
 toWord:{icon:'file',color:'blue',type:'export',format:'word'},
 toWordTables:{icon:'file',color:'green',type:'export',format:'wordTables'},
 toExcel:{icon:'file',color:'green',type:'export',format:'xlsx'},
 toCSV:{icon:'file',color:'green',type:'export',format:'csv'},
 toPpt:{icon:'image',color:'pink',type:'export',format:'pptx'},
 toPptEditable:{icon:'text',color:'green',type:'export',format:'editablePptx'},
 pdfLong:{icon:'image',color:'sky',type:'export',format:'long'},
 enhance:{icon:'image',color:'green',type:'photo',preset:'enhance'},
 restorePhoto:{icon:'image',color:'sky',type:'photo',preset:'restore'},
 manualErase:{icon:'delete',color:'green',type:'photo',preset:'eraser'},
 eraseColoredMarks:{icon:'delete',color:'blue',type:'photo',preset:'erase:blue'},
 eraseLightWatermark:{icon:'delete',color:'sky',type:'photo',preset:'erase:light-gray'},
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
 formulaOcr:['Formula OCR (linear · beta)','قراءة المعادلات الخطية (تجريبي)','OCR formules linéaires (bêta)','OCR fórmulas lineales (beta)','Formel OCR (linear, Beta)','OCR fórmulas lineares (beta)','OCR formule lineari (beta)'],
 photoTranslation:['Photo Translation (offline after download)','ترجمة صورة على الهاتف','Traduction photo sur appareil','Traducción foto en el dispositivo','Foto lokal übersetzen','Tradução de foto no aparelho','Traduci foto sul telefono'],
 lockPdf:['Lock PDF (AES-256)','حماية PDF بكلمة السر','Protéger PDF (AES-256)','Proteger PDF (AES-256)','PDF verschlüsseln','Proteger PDF (AES-256)','Proteggi PDF (AES-256)'],
 aiChat:['AI Chat (your own API key)','AI Chat (مفتاح شخصي)','AI Chat (clé API personnelle)','AI Chat (clave API propia)','AI Chat (eigener API-Schlüssel)','AI Chat (chave API própria)','AI Chat (chiave API personale)'],
 solverAI:['Solver AI (your own API key)','Solver AI (مفتاح شخصي)','Solver AI (clé API personnelle)','Solver AI (clave API propia)','Solver AI (eigener API-Schlüssel)','Solver AI (chave API própria)','Solver AI (chiave API personale)'],
 countCam:['CountCam (common objects)','CountCam (عدّ الأشياء)','CountCam (compter objets)','CountCam (contar objetos)','CountCam (Objekte zählen)','CountCam (contar objetos)','CountCam (conta oggetti)'],
 scanCode:['Scan QR & Barcode','قراءة QR والباركود','Lire QR et code-barres','Leer QR y código','QR / Barcode lesen','Ler QR e código','Leggi QR e barcode'],
 idcard:['ID Cards','البطاقة الوطنية',"Cartes d’identité",'Documentos de identidad','Ausweise','Cartões de identidade','Carte d’identità'],
 bookScan:['Book Scan','مسح الكتب','Numériser un livre','Escanear libro','Buch scannen','Digitalizar livro','Scansiona libro'],
 slideScan:['Slides Scan','مسح العروض','Scanner des diapositives','Escanear diapositivas','Folien scannen','Digitalizar slides','Scansione slide'],
 whiteboard:['Whiteboard Enhance','تحسين السبورة','Améliorer tableau blanc','Mejorar pizarra','Whiteboard verbessern','Melhorar quadro','Migliora lavagna'],
 timestamp:['Timestamp','إضافة التاريخ والساعة','Horodatage','Fecha y hora','Zeitstempel','Data e hora','Data e ora'],
 importImages:['Import Images','استيراد الصور','Importer images','Importar imágenes','Bilder importieren','Importar imagens','Importa immagini'],
 importFiles:['Import Files','استيراد الملفات','Importer fichiers','Importar archivos','Dateien importieren','Importar ficheiros','Importa file'],
 toWordTables:['Word with editable tables (PDF text)','Word بجداول قابلة للتعديل','Word avec tableaux modifiables','Word con tablas editables','Word mit bearbeitbaren Tabellen','Word com tabelas editáveis','Word con tabelle modificabili'],
 toWord:['To Word (OCR)','تحويل إلى Word','Vers Word (OCR)','A Word (OCR)','Nach Word (OCR)','Para Word (OCR)','In Word (OCR)'],
 toExcel:['To Excel (.xlsx)','إلى Excel قابل للتعديل','Vers Excel (.xlsx)','A Excel (.xlsx)','Nach Excel (.xlsx)','Para Excel (.xlsx)','In Excel (.xlsx)'],
 toCSV:['To CSV (text)','تحويل إلى Excel (CSV)','Vers Excel (CSV)','A Excel (CSV)','Nach Excel (CSV)','Para Excel (CSV)','In Excel (CSV)'],
 toPptEditable:['To PPT (editable text)','PPT بنص قابل للتعديل','PPT avec texte modifiable','PPT con texto editable','PPT mit editierbarem Text','PPT com texto editável','PPT con testo modificabile'],
 toPpt:['To PPT (image slides)','تحويل إلى PowerPoint','Vers PPT (images)','A PPT (imágenes)','Nach PPT (Bilder)','Para PPT (imagens)','In PPT (immagini)'],
 pdfLong:['PDF to Long Image','PDF إلى صورة طويلة','PDF en longue image','PDF a imagen larga','PDF als langes Bild','PDF em imagem longa','PDF in immagine lunga'],
 restorePhoto:['Restore Photo (denoise)','ترميم الصورة وإزالة التشويش','Restaurer photo (débruitage)','Restaurar foto (ruido)','Foto entrauschen','Restaurar foto (ruído)','Restauro foto (rumore)'],
 enhance:['Restore / Enhance Photo','تحسين الصور','Améliorer photo','Mejorar foto','Foto verbessern','Melhorar foto','Migliora foto'],
 eraseColoredMarks:['Remove colored ink (manual)','مسح الحبر الملون (تحديد يدوي)','Effacer encre colorée (manuel)','Borrar tinta de color (manual)','Farbtinte entfernen (manuell)','Apagar tinta colorida (manual)','Rimuovi inchiostro colorato (manuale)'],
 eraseLightWatermark:['Erase faint watermark (manual)','مسح العلامة الرمادية (تحديد يدوي)','Effacer filigrane clair (manuel)','Borrar marca clara (manual)','Wasserzeichen entfernen (manuell)','Apagar marca clara (manual)','Rimuovi filigrana chiara (manuale)'],
 manualErase:['Erase with Brush','ممحاة يدوية','Effacer au pinceau','Borrar con pincel','Mit Pinsel löschen','Apagar com pincel','Cancella con pennello'],
 managePages:['Manage Pages','إدارة الصفحات','Gérer les pages','Gestionar páginas','Seiten verwalten','Gerir páginas','Gestisci pagine'],
 printPdf:['Print PDF','طباعة PDF','Imprimer PDF','Imprimir PDF','PDF drucken','Imprimir PDF','Stampa PDF']
};
const langIndex={en:0,ar:1,fr:2,es:3,de:4,pt:5,it:6};
export function hubGroupLabel(lang,id){const idx=langIndex[lang]??0;return groups[lang]?.[toolGroups.findIndex(x=>x.id===id)]||groups.en[toolGroups.findIndex(x=>x.id===id)]||id}
export function hubLabel(lang,id,fallback){const values=labels[id];return values?.[langIndex[lang]??0]||fallback||id}
export function hubLanguages(){return Object.keys(langIndex)}
