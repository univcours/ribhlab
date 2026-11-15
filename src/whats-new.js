import {mountDialogControls} from './modal-shell.js';
// Version-aware release notes: describe verified code without promising semantic or generative AI.
export const changesForVersion=(language='en')=>{
 const data={
  "en": {
    "title": "What's New in RivoScan",
    "subtitle": "Release",
    "close": "Got it",
    "items": [
      "AI Deep Clean (Google ML Kit FULL) now opens from the main Scan button, Home shortcut, ID Card and Tools. Google handles auto-crop, cleanup and review; native CameraX is only an on-device fallback or manual corner editor. Advanced photo fusion, UVDoc and relative 3D live under Scan settings, without any separate PerfectScan screen.",
      "One document scanner: UVDoc AI flatten now works inside the native camera filters, with visible processing and a Save button that activates only after a real result. No separate Pro/Smart scan buttons, no consent checkbox, no empty white photo preview; optional 2–4-angle correction lives under Scan > Advanced.",
      "Capture review is now mandatory: real photo stays on screen with paper-corner adjustment, quality check for blur, glare and lighting, live filter processing, Before/After and Save or Retake. High-resolution crop is increased in HD, with turquoise theme and redesigned launcher icon.",
      "Comfort design with checked-photo Share and Delete side-by-side; strong wrinkle correction slider and on-device AI Deep Clean.",
      "Interactive gallery: 6× pinch zoom, double tap, pan and direct edit. Reduce wrinkles protects originals, stamps and signatures.",
      "Paper Scan Pro enhances document brightness and colored seals without overwriting the original. AI Scan uses ML Kit FULL on supported Android phones.",
      "Colored-ink cleanup: brush only the area you own and choose automatic colored-ink detection or blue, red, green and light-gray selection.",
      "Smart Erase now chooses more consistent image-boundary colors to reduce dark ink smearing when repairing an annotation.",
      "Restore Photo repairs isolated dust pixels in otherwise uniform areas without replacing a connected text stroke.",
      "Undo now removes an entire brush gesture. Each stroke keeps its selected color when you change tools.",
      "Book Scan estimates left and right page curvature independently; manual correction and original copies remain available."
    ],
    "limits": "Color selection is not automatic handwriting or watermark recognition. Restoration is not generative AI; complex folds and damaged photos require manual review. AI Chat/Solver require explicit consent, network and a personal API key."
  },
  "ar": {
  "title": "ما الجديد في RivoScan",
  "subtitle": "الإصدار",
  "close": "حسنًا",
  "items": [
    "أصبح Google ML Kit FULL الماسح الأساسي للمستندات، ويوفر تحديد الحواف وتنقية الصور والمراجعة قبل الحفظ.",
    "تتضمن أدوات المسح معالجة محلية للمستندات وإمكانية ضبط الحواف ومراجعة الصور قبل حفظها.",
    "تتيح المعاينة ضبط الزوايا والتحقق من وضوح الصورة والإضاءة والتوهج، مع المقارنة وإعادة الالتقاط.",
    "أُعيد تنظيم واجهة المستندات والمشاركة وأدوات التصحيح لتسهيل الوصول إليها.",
    "تدعم معاينة الصور التكبير والتحريك والتعديل، مع الحفاظ على النسخ الأصلية.",
    "يحسّن Paper Scan Pro وضوح الورق ويحدّ من الظلال مع الحفاظ على الأختام قدر الإمكان.",
    "تتيح أداة إزالة الحبر الملون تحديد منطقة المعالجة بالفرشاة واختيار اللون المناسب.",
    "تحسّن أداة Smart Erase إصلاح العلامات بالاعتماد على الألوان القريبة من المنطقة المحددة.",
    "تساعد أداة Restore Photo على تقليل آثار الغبار المعزولة في الصور.",
    "يتيح زر التراجع إلغاء ضربة فرشاة كاملة مع حفظ اختيار لون كل ضربة.",
    "تقدّر أداة Book Scan انحناء صفحتي الكتاب بصورة مستقلة، مع إمكانية التصحيح اليدوي."
  ],
  "limits": "اختيار لون الحبر لا يعني التعرف الآلي على الكتابة اليدوية أو العلامات المائية. لا يُعد ترميم الصور ذكاءً اصطناعيًا توليديًا، وقد تحتاج الصور المتضررة إلى مراجعة. تتطلب أدوات الذكاء الاصطناعي الخارجية موافقة صريحة واتصالًا بالإنترنت ومفتاح API شخصيًا."
},
  "fr": {
    "title": "Nouveautés RivoScan",
    "subtitle": "Version",
    "close": "Compris",
    "items": [
      "AI Deep Clean (Google ML Kit FULL) est désormais le scanner principal depuis Accueil, Scan et Carte d'identité. CameraX sert de secours ou à ajuster les coins. Fusion multi-vues, UVDoc et 3D relative restent dans les réglages du scan, sans module séparé.",
      "Un seul scanner : UVDoc IA intégré aux filtres natifs, traitement visible et Enregistrer activé après le résultat. Plus de boutons Pro/Smart séparés, case de consentement ou aperçu blanc vide ; correction multi-angle dans Scan > Avancé.",
      "Photo conservée à l'écran pour contrôle des angles, flou, éclairage et reflets ; traitement visible, filtres, comparaison, enregistrer ou reprendre. Recadrage HD amélioré et thème/icône turquoise.",
      "Interface apaisée, Partager et Supprimer côte à côte pour les photos sélectionnées, correction des plis et nettoyage IA.",
      "Galerie tactile avec zoom 6× et édition directe. Réduction des plis avec cachets et signatures préservés.",
      "Paper Scan Pro corrige l'éclairage et conserve les cachets. AI Scan utilise ML Kit FULL sur les appareils Android compatibles.",
      "Sélection de l'encre colorée uniquement dans la zone brossée, avec choix automatique de couleur ou de bleu/rouge/vert/gris clair.",
      "Smart Erase préserve mieux les lettres voisines en favorisant des bords de couleur cohérente.",
      "Restore Photo répare de petits pixels de poussière isolés sans effacer les traits continus.",
      "Annulation par geste entier; chaque trait conserve sa couleur choisie.",
      "Book Scan estime indépendamment la courbure des deux pages, avec correction manuelle."
    ],
    "limits": "Pas de reconnaissance sémantique automatique des écritures ou filigranes. Restauration locale non générative; vérifier les documents. L'IA distante requiert votre accord et une clé API."
  },
  "es": {
    "title": "Novedades RivoScan",
    "subtitle": "Versión",
    "close": "Entendido",
    "items": [
      "AI Deep Clean (Google ML Kit FULL) ahora es el escáner principal desde Inicio, Escanear y DNI. CameraX solo como respaldo o editor de esquinas. Fusión, UVDoc y 3D relativa en ajustes, sin PerfectScan separado.",
      "Un solo escáner: UVDoc IA integrado en filtros de cámara, procesamiento visible y Guardar activo tras la imagen. Sin botones Pro/Smart separados, casilla de aceptación ni vista blanca vacía; multiángulo en Escanear > Avanzado.",
      "La foto permanece visible: ajustar esquinas, revisar enfoque, luz y reflejos, filtros, comparación y Guardar/Repetir. Recorte HD mejorado y estilo/icono turquesa.",
      "Diseño cómodo, Compartir y Eliminar juntos para fotos elegidas, ajuste de pliegues y limpieza IA local.",
      "Galería con zoom 6× y edición directa. Reduce pliegues manteniendo sellos y firmas.",
      "Paper Scan Pro améliore le papier sans effacer les tampons. AI Scan utilise ML Kit FULL sur Android compatible.",
      "Selección de tinta de color solo dentro de la zona marcada, automática por color o por azul/rojo/verde/gris claro.",
      "Smart Erase combina bordes de colores similares para reducir manchas sobre texto cercano.",
      "Restore Photo repara puntos aislados de polvo y conserva trazos continuos.",
      "Deshacer elimina todo el trazo; cada marca conserva el color seleccionado.",
      "Book Scan calcula por separado la curvatura de cada página y permite ajuste manual."
    ],
    "limits": "La selección de color no reconoce automáticamente escritura o marcas de agua. No es restauración generativa; revisar los resultados. La IA requiere consentimiento y clave API."
  },
  "de": {
    "title": "Neu in RivoScan",
    "subtitle": "Version",
    "close": "Verstanden",
    "items": [
      "AI Deep Clean (Google ML Kit FULL) startet jetzt über die Haupt-Scan-Taste, Startseite und Ausweis. CameraX bleibt nur Notlösung/Eckeneditor. Mehrfachaufnahme, UVDoc und relatives 3D in Scan-Einstellungen.",
      "Ein Scanner: UVDoc KI direkt in der nativen Kamerafilterliste; Speichern erst nach Ergebnis. Keine separaten Smart/Pro-Scanner, Zustimmungskästchen oder leere weiße Vorschau; Mehrwinkelmodus unter Scan > Erweitert.",
      "Foto bleibt sichtbar: Ecken, Unschärfe, Licht und Reflexe prüfen; Filter, Fortschritt und Vorher/Nachher, Speichern oder Neuaufnahme. Bessere HD-Auflösung und türkisfarbenes Design.",
      "Ruhiges Design, Teilen/Löschen nebeneinander für ausgewählte Bilder, Faltenstärke und lokale KI-Reinigung.",
      "Galerie: Zoom 6× und direkte Bearbeitung. Faltenkorrektur schützt Originalstempel und Unterschriften.",
      "Paper Scan Pro verbessert den Papierkontrast und schützt Stempel. AI Scan verwendet ML Kit FULL auf unterstützten Android-Geräten.",
      "Farbige Tinte nur in markierten Bereichen auswählen: automatisch nach Farbe oder Blau/Rot/Grün/Hellgrau.",
      "Smart Erase nutzt besser passende Randfarben und reduziert das Verschmieren benachbarter Schrift.",
      "Restore Photo behebt isolierte Staubpunkte und schützt durchgehende Linien.",
      "Rückgängig entfernt einen gesamten Pinselstrich; dessen Farbwahl bleibt erhalten.",
      "Book Scan schätzt die Krümmung jeder Buchseite getrennt, mit manueller Nachjustierung."
    ],
    "limits": "Keine automatische Erkennung von Handschrift oder Wasserzeichen. Keine generative Fotorekonstruktion; Ergebnisse prüfen. Externe KI braucht Zustimmung und API-Schlüssel."
  },
  "pt": {
    "title": "Novidades RivoScan",
    "subtitle": "Versão",
    "close": "Entendi",
    "items": [
      "AI Deep Clean (Google ML Kit FULL) é o scanner principal na página inicial, Scan e documentos de identidade. CameraX só como alternativa/editor de cantos. Fusão, UVDoc e 3D nas definições.",
      "Um scanner: UVDoc IA nos filtros da câmera, processamento visível e Guardar apenas após o resultado. Sem scan Pro/Smart separado, consentimento obrigatório nem pré-visualização branca vazia; vários ângulos em Scan > Avançado.",
      "Fotografia permanece visível para ajustar cantos, analisar nitidez, luz e reflexos, comparar e Guardar/Repetir. Maior resolução HD e tema/ícone turquesa.",
      "Design confortável, Partilhar/Eliminar juntos nas fotos selecionadas, controlo de vincos e limpeza IA.",
      "Zoom 6× na galeria e edição direta. Corrigir vincos preservando carimbos e assinaturas.",
      "Paper Scan Pro melhora a luz e mantém carimbos. AI Scan utiliza ML Kit FULL em Android compatível.",
      "Seleção de tinta colorida só na região pintada, automática por cor ou azul/vermelho/verde/cinzento claro.",
      "Smart Erase dá preferência a bordas de cor semelhante e protege melhor o texto vizinho.",
      "Restore Photo repara pequenos pontos isolados de poeira, preservando linhas contínuas.",
      "Desfazer remove um traço inteiro; cada traço mantém a sua cor original.",
      "Book Scan estima a curvatura de cada página separadamente, com ajuste manual."
    ],
    "limits": "Não reconhece automaticamente caligrafia ou marcas de água. A restauração não é generativa; confirme o resultado. IA externa exige consentimento e chave API."
  },
  "it": {
    "title": "Novità RivoScan",
    "subtitle": "Versione",
    "close": "Capito",
    "items": [
      "AI Deep Clean (Google ML Kit FULL) è ora lo scanner principale nella Home, in Scan e per i documenti. CameraX solo come alternativa/editor degli angoli. Fusione, UVDoc e 3D nelle impostazioni.",
      "Uno scanner: UVDoc IA nei filtri della fotocamera, elaborazione visibile e Salva solo dopo il risultato. Nessun Pro/Smart separato, casella di conferma o anteprima vuota; multiangolo in Scan > Avanzate.",
      "La foto resta visibile: regolazione angoli, controllo nitidezza, luce e riflessi; filtri, confronto, Salva o Riprendi. HD migliore e tema/icona turchese.",
      "Design confortevole, Condividi/Elimina affiancati sulle immagini selezionate, riduzione pieghe e pulizia IA.",
      "Galleria con zoom 6× e modifica diretta. Riduci pieghe preservando timbri e firme.",
      "Paper Scan Pro migliora la luminosità senza cancellare i timbri. AI Scan usa ML Kit FULL su Android compatibile.",
      "Selezione dell'inchiostro colorato solo nell'area disegnata, automatica per colore o blu/rosso/verde/grigio chiaro.",
      "Smart Erase privilegia bordi di colore simile per evitare sbavature sul testo vicino.",
      "Restore Photo ripara piccoli punti di polvere isolati preservando le linee continue.",
      "Annulla rimuove un intero gesto; ogni tratto conserva il colore iniziale.",
      "Book Scan stima separatamente la curvatura delle due pagine e permette correzioni manuali."
    ],
    "limits": "La selezione cromatica non riconosce automaticamente scrittura o filigrane. Il restauro non è generativo; verificare i risultati. L'IA esterna richiede consenso e chiave API."
  }
};
 const recent={
 en:'New: No Shadow corrects uneven white-paper lighting while preserving stamps; Book Scan can suggest a dark page gutter (manual override); PDF to Excel now creates one editable sheet per PDF page.',
 ar:'جديد: تقلّل أداة No Shadow ظلال الورق مع الحفاظ على الأختام. وتساعد أداة Book Scan في تحديد منتصف الكتاب يدويًا، كما يُنشئ تحويل PDF إلى Excel ورقة عمل لكل صفحة.',
 fr:'Nouveau : No Shadow corrige les ombres sans effacer les tampons ; Book Scan propose la reliure avec réglage manuel ; PDF vers Excel crée une feuille modifiable par page.',
 es:'Nuevo: No Shadow equilibra las sombras preservando sellos; Book Scan sugiere el lomo con ajuste manual; PDF a Excel crea una hoja editable por página.',
 de:'Neu: No Shadow gleicht Papierschatten aus und bewahrt Stempel; Book Scan schlägt die Buchfalzposition vor; PDF zu Excel erstellt ein bearbeitbares Blatt pro Seite.',
 pt:'Novo: No Shadow corrige sombras preservando carimbos; Book Scan sugere a lombada com ajuste manual; PDF para Excel cria uma folha editável por página.',
 it:'Novità: No Shadow attenua le ombre preservando timbri; Book Scan propone il dorso con regolazione manuale; PDF in Excel crea un foglio modificabile per pagina.'
 };
  const extra={
  en:'New: Book Scan can align curved text rows (beta); optional Formula OCR vision AI and Solver camera require your API key and consent. CountCam removes duplicate overlapping detections. Play AAB needs private signing keys.',
  ar:'جديد: تتضمن أداة Book Scan تقويم السطور المنحنية بصورة تجريبية. تُرسل أدوات Formula OCR وSolver الصور إلى مزود الذكاء الاصطناعي بعد موافقتك فقط. تقلّل CountCam العد المتكرر. يتطلب النشر على Google Play توقيعًا معتمدًا.',
  fr:'Nouveau : correction des lignes courbées (bêta), OCR maths IA et caméra Solver avec consentement et clé API. CountCam évite les doubles comptes. AAB Play nécessite signature.',
  es:'Nuevo: corrección de líneas curvas (beta), OCR matemático con IA y cámara Solver con consentimiento y clave API. CountCam reduce conteos duplicados. AAB requiere firma.',
  de:'Neu: Textzeilen-Begradigung (Beta), optionale KI-Formelerkennung und Solver-Kamera nur mit Zustimmung/API-Schlüssel. CountCam entfernt Doppelzählungen. AAB erfordert Signatur.',
  pt:'Novo: correção de linhas curvas (beta), OCR matemático IA e câmara Solver com consentimento e chave API. CountCam reduz duplicações. AAB requer assinatura.',
  it:'Novità: allineamento righe curve (beta), OCR matematico IA e fotocamera Solver con consenso e chiave API. CountCam riduce conteggi duplicati. AAB richiede firma.'
 };
 const latest={"en":["Find your saved files with search, share, rename and delete actions.","QR and barcode scans are saved to two permanent TXT files; scanner XLSX files are no longer created.","Every scanned code has its own Copy button, and valid web links have an Open Link button.","Already-saved codes are not appended twice across different days.","UltraScan recognizes multiple codes on a page and supports camera-dependent zoom.","Save confirmations use short Android toasts."],"ar":["تظهر الملفات المحفوظة مع أدوات البحث والمشاركة وإعادة التسمية والحذف.","تُحفظ رموز QR والباركود في ملفي TXT ثابتين منفصلين، ولم يعد ماسح الرموز ينشئ ملفات Excel.","يوجد زر نسخ مستقل لكل رمز، وزر لفتح الرابط عند التعرف على عنوان ويب صالح.","يُمنع تكرار حفظ الرمز نفسه في السجل الدائم، وتظهر رسالة توضّح أنه محفوظ مسبقًا.","يتعرف UltraScan على عدة رموز في الصورة ويدعم التقريب بحسب إمكانيات الكاميرا.","تظهر رسائل تأكيد الحفظ في إشعارات Android قصيرة."],"fr":["Fichiers avec recherche, partage, renommage et suppression.","QR et codes-barres enregistrés dans deux fichiers TXT permanents, sans nouveau fichier Excel.","Chaque code possède un bouton Copier et, si applicable, Ouvrir le lien.","Un code déjà enregistré n'est pas ajouté deux fois toute période.","UltraScan recherche plusieurs codes par page avec zoom selon la caméra.","Confirmations courtes d'Android après enregistrement."],"es":["Archivos con búsqueda, compartir, renombrar y eliminar.","QR y códigos de barras guardados en dos archivos TXT permanentes, sin nuevos Excel.","Cada código tiene su propio botón Copiar y Abrir enlace cuando corresponde.","Los códigos guardados en cualquier fecha no se duplican.","UltraScan busca varios códigos por página con zoom según la cámara.","Confirmaciones breves de Android."],"de":["Dateien mit Suche, Teilen, Umbenennen und Löschen.","QR- und Barcodes werden getrennt in zwei dauerhaften TXT-Dateien gespeichert, ohne neue Excel-Protokolle.","Jeder Code hat eine Kopieren-Taste und bei gültigen Weblinks eine Öffnen-Taste.","Bereits gespeicherte Codes werden auch an späteren Tagen nicht dupliziert.","UltraScan erkennt mehrere Codes pro Seite mit kameraabhängigem Zoom.","Kurze Android-Speicherbestätigungen."],"pt":["Ficheiros com pesquisa, partilha, renomear e eliminar.","QR e códigos de barras em dois ficheiros TXT permanentes, sem novos Excel.","Cada código tem Copiar e, se aplicável, Abrir ligação.","Os códigos já guardados em datas posteriores não são duplicados.","UltraScan procura vários códigos com zoom conforme a câmara.","Confirmações breves do Android."],"it":["File con ricerca, condivisione, rinomina ed elimina.","QR e codici a barre salvati in due file TXT permanenti, senza nuovi Excel.","Ogni codice ha Copia e, se valido, Apri link.","I codici già salvati anche in date successive non sono duplicati.","UltraScan riconosce più codici per pagina con zoom in base alla fotocamera.","Brevi conferme di salvataggio Android."]};
 const plateWarnings={"en":"License plate OCR is experimental: verify readings; lighting, angle and glare affect accuracy. OCR models may need a first-use download.","ar":"التعرّف على لوحات المركبات ما يزال تجريبيًا. تؤثر الإضاءة وزاوية التصوير والانعكاسات في الدقة؛ لذا يجب مراجعة النتائج. قد يلزم تنزيل ملفات OCR عند الاستخدام الأول.","fr":"La lecture de plaques est expérimentale : vérifiez les résultats selon lumière, angle et reflets. Un téléchargement OCR peut être requis.","es":"La lectura de matrículas es experimental: revise resultados. La luz y el ángulo afectan la precisión; OCR puede requerir descarga.","de":"Kennzeichenerkennung ist experimentell: Ergebnisse prüfen. Licht, Winkel und Spiegelung beeinflussen die Genauigkeit. OCR kann einen Download benötigen.","pt":"O reconhecimento de matrículas é experimental: confirme leituras. Luz, ângulo e reflexos afetam precisão; OCR pode precisar de dados.","it":"Il riconoscimento targhe è sperimentale: verificare i risultati. Luce, angolo e riflessi incidono; OCR può richiedere download."};
 const note=data[language]||data.en;
 return {...note,items:(latest[language]||latest.en),
  limits:note.limits+' '+(plateWarnings[language]||plateWarnings.en)};
};
const latestModalRelease={
 en:['Mobile tool windows now fit the screen, with readable buttons and a visible Close button.','Swipe from the right edge to dismiss tool windows; Android Back closes the correct window without saving.','Book Scan has a clear empty state, optional Advanced correction, and Save activates only after a photo.','Ad diagnostics in Settings shows consent, loading status and errors. Ads still depend on Google AdMob availability.'],
 ar:['أصبحت نوافذ الأدوات مناسبة للهاتف، بأزرار واضحة وزر إغلاق ظاهر.','يؤدي السحب من الحافة أو الضغط على الرجوع إلى إغلاق النافذة دون الحفظ عن طريق الخطأ.','تتضمن أداة Book Scan معاينة واضحة وتصحيحًا متقدمًا اختياريًا، ولا يُفعّل الحفظ إلا بعد إضافة صورة.','تُظهر إعدادات تشخيص الإعلانات حالة الموافقة والتحميل والأخطاء، ويظل عرض الإعلانات مرتبطًا بخدمة AdMob.'],
 fr:['Fenêtres adaptées aux téléphones, avec commandes lisibles et fermeture visible.','Glisser depuis le bord droit pour fermer, sans enregistrer par erreur.','Book Scan offre un état vide explicite, une correction avancée facultative et un enregistrement après photo.','Diagnostic des annonces et du consentement dans les réglages ; la diffusion dépend aussi d’AdMob.'],
 es:['Ventanas adaptadas al móvil, con botones legibles y cierre visible.','Desliza desde el borde derecho para cerrar sin guardar por error.','Escáner de libros con vista vacía clara, ajustes avanzados opcionales y guardado tras añadir una foto.','Diagnóstico de anuncios y consentimiento en Ajustes; la disponibilidad depende de AdMob.'],
 de:['Werkzeugfenster passen auf das Handy, mit lesbaren Tasten und Schließen-Knopf.','Wischen vom rechten Rand schließt ohne versehentliches Speichern.','Buchscan zeigt leere Vorschau und optionale Korrekturen; Speichern erst nach einem Foto.','Werbediagnose und Einwilligungsstatus in Einstellungen; Anzeigen hängen von AdMob ab.'],
 pt:['Janelas adaptadas ao telemóvel, com botões legíveis e Fechar visível.','Deslize da direita para fechar sem guardar por engano.','Digitalização de livros com estado vazio, correções opcionais e guardar só após foto.','Diagnóstico de anúncios e consentimento nas definições; a entrega depende do AdMob.'],
 it:['Finestre adattate ai telefoni, pulsanti leggibili e chiusura visibile.','Scorri dal bordo destro per chiudere senza salvare per errore.','Scanner libri con anteprima vuota chiara, correzioni avanzate facoltative e salvataggio dopo una foto.','Diagnostica annunci e consenso nelle impostazioni; la disponibilità dipende anche da AdMob.']
};
export const shouldShowReleaseNotes=(storage,version)=>storage.getItem('rivo-release-notes-read')!==version;
export function openWhatsNew({language='en',version='0.0.0',storage=localStorage}={}){
 const copy=changesForVersion(language);
 const overlay=document.createElement('div');overlay.className='rivo-release-overlay';
 const panel=document.createElement('section');panel.className='rivo-release-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=copy.title;panel.append(title);
 const subtitle=document.createElement('p');subtitle.textContent=copy.subtitle+' '+version;panel.append(subtitle);
 const list=document.createElement('ul');for(const note of copy.items){const item=document.createElement('li');item.textContent=note;list.append(item)}panel.append(list);
 const limits=document.createElement('p');limits.className='rivo-release-limits';limits.textContent=copy.limits;panel.append(limits);
 const ok=document.createElement('button');ok.type='button';ok.textContent=copy.close;panel.append(ok);
 const close=()=>{overlay.remove();try{storage.setItem('rivo-release-notes-read',version)}catch{}};
 ok.addEventListener('click',close);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
 mountDialogControls({overlay,panel,close,language});
 overlay.append(panel);document.body.append(overlay);
 ok.focus();
 return close;
}
