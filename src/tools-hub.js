// Only tools with a real local implementation are shown.
// Feature-specific labels are translated independently of legacy PDF workspace text.
// Curated high-value hub. Previous implementations remain in source so the
// user can restore them, but duplicated/experimental controls do not clutter Tools.
// Do not hide QR/barcode, vehicle plates, PDF core, OCR or Excel export.
// Smart AutoCapture already has the dedicated central camera and a Home quick action;
// avoid showing the same camera tool again as a redundant Tools tile.
export const toolGroups=[
 {id:'scan',entries:['scanCode','perfectScanQuality','idcard','idPhotoMaker','plateScanner','photoTranslation','formulaOcr','ocr','bookScan']},
 {id:'convert',entries:['convertDocument']},
 {id:'edit',entries:['privacyShield','photoStudio','combineFiles','managePages','annotatePdf','pdfPrivacy','compress']},
 {id:'utilities',entries:['peerTransfer','shareFiles']}
];
export const hubSpecial={
 smartAutoCapture:{icon:'scan',color:'green',type:'smartAutoCapture'},
 perfectScanQuality:{icon:'sparkle',color:'green',type:'perfectScan'},
 privacyShield:{icon:'shield',color:'green',type:'privacyShield'},
 // Composite tiles delegate to the already tested original implementations.
 convertDocument:{icon:'convert',color:'green',type:'mergedDialog'},
 annotatePdf:{icon:'sign',color:'green',type:'mergedDialog'},
 pdfPrivacy:{icon:'lock',color:'green',type:'mergedDialog'},
 photoStudio:{icon:'image',color:'green',type:'photo',preset:'enhance'},
 combineFiles:{icon:'merge',color:'green',type:'legacyTool',toolId:'bundle'},
 idcard:{icon:'idcard',color:'green',type:'idcard'},
 idPhotoMaker:{icon:'user',color:'sky',type:'idPhoto'},
 scanCode:{icon:'qr',color:'green',type:'barcode'},
 plateScanner:{icon:'scan',color:'green',type:'plates'},
 aiChat:{icon:'text',color:'violet',type:'aiDocument'},
 solverAI:{icon:'image',color:'blue',type:'aiSolver'},
 countCam:{icon:'camera',color:'green',type:'countCam'},
 lockPdf:{icon:'lock',color:'blue',type:'pdfLock'},
 photoTranslation:{icon:'text',color:'violet',type:'photoTranslation'},
 formulaOcr:{icon:'text',color:'blue',type:'formulaOcr'},
 smartScanPro:{icon:'scan',color:'green',type:'mlkitFull'},
 bookScan:{icon:'file',color:'sky',type:'book'},
 documentFlatten:{icon:'file',color:'green',type:'flatten'},
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
 eraseColoredMarks:{icon:'delete',color:'blue',type:'photo',preset:'erase:auto-colored'},
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
 smartAutoCapture:['Smart AutoCapture','التصوير التلقائي الذكي','Capture auto intelligente','Captura automática','Intelligente Auto-Aufnahme','Captura automática inteligente','Cattura automatica intelligente'],
 perfectScanQuality:['PerfectScan Pro','PerfectScan Pro','PerfectScan Pro','PerfectScan Pro','PerfectScan Pro','PerfectScan Pro','PerfectScan Pro'],
 privacyShield:['Privacy Shield','حماية وإخفاء المعلومات','Masquage sécurisé','Protección de privacidad','Datenschutz-Schutz','Proteção de privacidade','Protezione privacy'],
 convertDocument:['Convert documents','تحويل الوثائق','Convertir des documents','Convertir documentos','Dokumente konvertieren','Converter documentos','Converti documenti'],
 annotatePdf:['Write & sign PDF','الكتابة والتوقيع على PDF','Annoter et signer PDF','Anotar y firmar PDF','PDF beschriften & signieren','Anotar e assinar PDF','Annota e firma PDF'],
 pdfPrivacy:['PDF Privacy','حماية وخصوصية PDF','Confidentialité PDF','Privacidad PDF','PDF Datenschutz','Privacidade PDF','Privacy PDF'],
 photoStudio:['Enhance / Erase Photos','تحسين ومسح الصور','Retoucher / effacer photos','Mejorar / borrar fotos','Fotos verbessern / löschen','Melhorar / apagar fotos','Migliora / cancella foto'],
 combineFiles:['Combine PDFs & Images','دمج PDF والصور','Fusionner PDF et images','Combinar PDF e imágenes','PDFs und Bilder vereinen','Combinar PDFs e imagens','Unisci PDF e immagini'],
 idPhotoMaker:['ID Photos for Print','صور شخصية للطباعة','Photos d’identité à imprimer','Fotos de carné','Passfotos drucken','Fotos tipo passe','Fototessere da stampare'],
 formulaOcr:['Read Math Formulas','قراءة المعادلات','Lire les formules','Leer fórmulas','Formeln lesen','Ler fórmulas','Leggi formule'],
 photoTranslation:['Translate a Photo','ترجمة الصور','Traduire une photo','Traducir una foto','Foto übersetzen','Traduzir foto','Traduci una foto'],
 lockPdf:['Lock PDF (AES-256)','حماية PDF بكلمة السر','Protéger PDF (AES-256)','Proteger PDF (AES-256)','PDF verschlüsseln','Proteger PDF (AES-256)','Proteggi PDF (AES-256)'],
 aiChat:['AI Chat (your own API key)','AI Chat (مفتاح شخصي)','AI Chat (clé API personnelle)','AI Chat (clave API propia)','AI Chat (eigener API-Schlüssel)','AI Chat (chave API própria)','AI Chat (chiave API personale)'],
 solverAI:['Solver AI (your own API key)','Solver AI (مفتاح شخصي)','Solver AI (clé API personnelle)','Solver AI (clave API propia)','Solver AI (eigener API-Schlüssel)','Solver AI (chave API própria)','Solver AI (chiave API personale)'],
 countCam:['CountCam (common objects)','CountCam (عدّ الأشياء)','CountCam (compter objets)','CountCam (contar objetos)','CountCam (Objekte zählen)','CountCam (contar objetos)','CountCam (conta oggetti)'],
 scanCode:['Scan QR / Barcodes','مسح QR والباركود','Scanner QR / codes-barres','Escanear QR y códigos','QR / Barcodes scannen','Ler QR e códigos','Scansiona QR e codici'],
 plateScanner:['Scan License Plates','قراءة لوحات السيارات','Lire les plaques auto','Leer matrículas','Kennzeichen scannen','Ler matrículas','Leggi targhe auto'],
 idcard:['ID Cards','البطاقة الوطنية',"Cartes d’identité",'Documentos de identidad','Ausweise','Cartões de identidade','Carte d’identità'],
 smartScanPro:['AI Scan — clean paper (beta)','AI Scan — ورقة نقية (تجريبي)','Scan IA — papier nettoyé (bêta)','Escáner IA — papel limpio (beta)','KI-Scan — Papier reinigen (Beta)','Scan IA — papel limpo (beta)','Scan IA — carta pulita (beta)'],
 bookScan:['Scan Book Pages','مسح صفحات الكتب','Scanner des livres','Escanear libros','Buchseiten scannen','Digitalizar livros','Scansiona libri'],
 documentFlatten:['Document Flattening (beta)','تقويم الوثائق المنحنية','Aplatir document (bêta)','Aplanar documento (beta)','Dokument glätten (Beta)','Achatar documento (beta)','Appiattisci documento (beta)'],
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
const originalGroupOrder=['scan','import','convert','edit','utilities'];
export function hubGroupLabel(lang,id){const index=originalGroupOrder.indexOf(id);return groups[lang]?.[index]||groups.en[index]||id}
export function hubLabel(lang,id,fallback){const values=labels[id];return values?.[langIndex[lang]??0]||fallback||id}
export function hubLanguages(){return Object.keys(langIndex)}
