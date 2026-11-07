// Premium home view: localized labels and nine actions that exist in RivoScan.
export const homeTiles=Object.freeze([
 {id:'scan',icon:'camera',action:'data-live-camera',featured:true},
 {id:'import',icon:'image',action:'data-import="image"'},
 {id:'id',icon:'idcard',action:'data-id-card-scan'},
 {id:'flatten',icon:'scan',action:'data-hub-action="documentFlatten"'},
 {id:'erase',icon:'delete',action:'data-hub-action="manualErase"'},
 {id:'enhance',icon:'sparkle',action:'data-hub-action="enhance"'},
 {id:'book',icon:'book',action:'data-hub-action="bookScan"'},
 {id:'pdf',icon:'file',action:'data-tool="images"'},
 {id:'ocr',icon:'ocr',action:'data-tool="ocr"'}
]);
const copies={
 en:{hero:'Advanced scan tools',body:'All scanning tools are available without unlocking.',web:'Available in the Android app',tiles:'Smart scanning tools',subtitle:'Choose what you want to do',files:'My files',local:'Your documents stay on your phone',search:'Search documents',tabs:['All','PDF','Images'],names:['Smart Scan','From gallery','ID card','Flatten page','Smart erase','Enhance image','Book Scan','Images to PDF','Extract text']},
 ar:{hero:'مزايا متقدمة',body:'جميع أدوات السكانير متاحة بلا إعلانات لفتح الميزات.',web:'متوفرة في تطبيق أندرويد',tiles:'أدوات المسح الذكي',subtitle:'اختار الأداة اللي محتاج',files:'ملفاتي',local:'وثائقك محفوظة فالهاتف',search:'قلب على الوثائق',tabs:['الكل','PDF','الصور'],names:['مسح ذكي','من المعرض','مسح البطاقة','تقويم الانحناء','إزالة الكتابة','تحسين الصورة','مسح الكتب','تحويل إلى PDF','استخراج النص']},
 fr:{hero:'Outils avancés',body:'Tous les outils de numérisation sont disponibles directement.',web:'Disponible sur Android',tiles:'Outils de numérisation',subtitle:'Choisissez un outil',files:'Mes fichiers',local:'Vos documents restent sur le téléphone',search:'Rechercher',tabs:['Tous','PDF','Images'],names:['Scan intelligent','Galerie','Carte identité','Redresser','Gomme intelligente','Améliorer','Scanner livre','Images vers PDF','Extraire texte']},
 es:{hero:'Herramientas avanzadas',body:'Todas las herramientas están disponibles directamente.',web:'Disponible en Android',tiles:'Herramientas de escaneo',subtitle:'Elige una herramienta',files:'Mis archivos',local:'Documentos en tu teléfono',search:'Buscar documentos',tabs:['Todos','PDF','Imágenes'],names:['Escaneo inteligente','Galería','Identificación','Aplanar página','Borrado inteligente','Mejorar','Escanear libro','Imágenes a PDF','Extraer texto']},
 de:{hero:'Erweiterte Werkzeuge',body:'Alle Scan-Werkzeuge sind direkt verfügbar.',web:'In Android verfügbar',tiles:'Scan-Werkzeuge',subtitle:'Werkzeug wählen',files:'Meine Dateien',local:'Dateien bleiben auf dem Gerät',search:'Dokumente suchen',tabs:['Alle','PDF','Bilder'],names:['Smart Scan','Galerie','Ausweis','Seite glätten','Löschen','Bild verbessern','Buchscan','Bilder zu PDF','OCR']},
 pt:{hero:'Ferramentas avançadas',body:'Todas as ferramentas de digitalização estão disponíveis.',web:'Disponível no Android',tiles:'Ferramentas de digitalização',subtitle:'Escolha uma ferramenta',files:'Meus ficheiros',local:'Ficheiros guardados no telemóvel',search:'Pesquisar',tabs:['Todos','PDF','Imagens'],names:['Scan inteligente','Galeria','Identidade','Achatar','Apagar','Melhorar','Digitalizar livro','Imagens para PDF','Extrair texto']},
 it:{hero:'Strumenti avanzati',body:'Tutti gli strumenti di scansione sono disponibili.',web:'Disponibile su Android',tiles:'Strumenti di scansione',subtitle:'Scegli uno strumento',files:'I miei file',local:'Documenti salvati sul telefono',search:'Cerca documenti',tabs:['Tutti','PDF','Immagini'],names:['Smart Scan','Galleria','Documento','Appiattisci','Gomma intelligente','Migliora','Scansiona libri','Immagini in PDF','Estrai testo']}
};
export function premiumCopy(language='en'){return copies[language]||copies.en;}
