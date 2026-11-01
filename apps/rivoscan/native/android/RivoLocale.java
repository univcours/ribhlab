package com.ribhlab.rivoscan;

import java.util.HashMap;
import java.util.Map;

/** Small, offline translations for the native scanner UI. */
final class RivoLocale {
    private RivoLocale() {}
    private static final String[] KEYS = {
        "cameras","default","rear","front","single","batch","document","id","board",
        "photos","files","finish","saveScan","retake","detect","savePage","title",
        "help","cancel","capture","adjust","defaultReady","switching","chooseCamera",
        "importPhoto","chooseFile","finishScan","scannerHelp","noCamera","cameraError","autoCorners","flash"
    };
    private static final String[][] VALUES={
        {"Cameras","Default rear","Rear camera","Front camera","Single","Batch","Document","ID Card","Whiteboard",
         "Photos","Files","Finish","Scan & save","Retake","Detect","Save page","Adjust document edges",
         "Scanner help","Cancel","Capture","Adjust 4 corners","Default rear camera ready","Switching to","Choose camera",
         "Import photo","Choose from Files","Finish scanning","Scanner help","Camera unavailable","Could not open camera","Adjust the 4 corners","Flash unavailable"},
        {"الكاميرات","الخلفية الافتراضية","كاميرا خلفية","كاميرا أمامية","صفحة","عدة صفحات","وثيقة","بطاقة الهوية","سبورة",
         "الصور","الملفات","إنهاء","تصوير وحفظ","إعادة التصوير","تحديد الحواف","حفظ الصفحة","تعديل الحواف",
         "مساعدة السكانير","إلغاء","تصوير","عدّل الزوايا الأربع","الكاميرا الخلفية جاهزة","تبديل إلى","اختيار الكاميرا",
         "استيراد صورة","اختيار ملف","إنهاء التصوير","مساعدة السكانير","الكاميرا غير متاحة","تعذر فتح الكاميرا","عدّل الزوايا الأربع","الفلاش غير متاح"},
        {"Caméras","Arrière par défaut","Caméra arrière","Caméra avant","Simple","Lot","Document","Carte d'identité","Tableau blanc",
         "Photos","Fichiers","Terminer","Scanner et enregistrer","Reprendre","Détecter","Enregistrer","Ajuster les bords",
         "Aide scanner","Annuler","Capturer","Ajuster les 4 coins","Caméra arrière prête","Passer à","Choisir caméra",
         "Importer photo","Choisir un fichier","Terminer le scan","Aide scanner","Caméra indisponible","Impossible d'ouvrir la caméra","Ajuster les 4 coins","Flash indisponible"},
        {"Cámaras","Trasera predeterminada","Cámara trasera","Cámara frontal","Única","Lote","Documento","Identidad","Pizarra",
         "Fotos","Archivos","Finalizar","Escanear y guardar","Repetir","Detectar","Guardar página","Ajustar bordes",
         "Ayuda","Cancelar","Capturar","Ajustar 4 esquinas","Cámara lista","Cambiar a","Elegir cámara",
         "Importar foto","Elegir archivo","Terminar escaneo","Ayuda","Cámara no disponible","No se pudo abrir la cámara","Ajustar las 4 esquinas","Flash no disponible"},
        {"Kameras","Standard-Rückkamera","Rückkamera","Frontkamera","Einzeln","Stapel","Dokument","Ausweis","Whiteboard",
         "Fotos","Dateien","Fertig","Scannen & speichern","Erneut","Erkennen","Seite speichern","Kanten anpassen",
         "Scannerhilfe","Abbrechen","Aufnehmen","4 Ecken anpassen","Rückkamera bereit","Wechsel zu","Kamera wählen",
         "Foto importieren","Datei wählen","Scan beenden","Scannerhilfe","Kamera nicht verfügbar","Kamera kann nicht geöffnet werden","4 Ecken anpassen","Blitz nicht verfügbar"},
        {"Câmaras","Traseira predefinida","Câmara traseira","Câmara frontal","Único","Lote","Documento","Identidade","Quadro branco",
         "Fotos","Ficheiros","Concluir","Digitalizar e guardar","Repetir","Detetar","Guardar página","Ajustar cantos",
         "Ajuda","Cancelar","Capturar","Ajustar 4 cantos","Câmara traseira pronta","Mudar para","Escolher câmara",
         "Importar foto","Escolher ficheiro","Concluir digitalização","Ajuda","Câmara indisponível","Não foi possível abrir a câmara","Ajustar 4 cantos","Flash indisponível"},
        {"Fotocamere","Posteriore predefinita","Fotocamera posteriore","Fotocamera frontale","Singolo","Sequenza","Documento","Carta d'identità","Lavagna",
         "Foto","File","Fine","Scansiona e salva","Riprova","Rileva","Salva pagina","Regola i bordi",
         "Aiuto scanner","Annulla","Scatta","Regola i 4 angoli","Fotocamera pronta","Passa a","Scegli fotocamera",
         "Importa foto","Scegli file","Termina scansione","Aiuto scanner","Fotocamera non disponibile","Impossibile aprire la fotocamera","Regola i 4 angoli","Flash non disponibile"}
    };
    // Shared translations for every native scanner state and dialog (seven supported languages).
    private static final String[] EXTRA_KEYS = {"bestCamera","retryCamera","liveEdges","basicMode","align","basicHint","loupe","batchReady","singleReady","modeReady","flashOff","flashOn","noFlash","helpTitle","helpText","sounds","soundOn","soundOff","loadingCameras","camerasError","noRearTitle","noRearText","cameraPicker","usingAuto","switching","noWorking","noWorkingText","close","capturePage","imageError","captureError","importError","saveBasic","saveUncropped","saveError","adjustError","importPhoto","bestSelection"};
    private static final String[][] EXTRA_VALUES = {
        {"Auto · best camera","Trying another rear camera…"," · live edges"," · basic camera","Align your document inside the frame","Take a photo · stored in Documents/RivoScan","Drag a blue corner · magnifier shows the exact edge","Batch: capture as many pages as needed","Single: save one page and return"," mode ready","ϟ Off","ϟ On","Flash is not available on this camera.","RivoScan Smart Scanner","Point at a page. Drag its four corners with the magnifier for precision, then save. Batch scans multiple pages; HD favors image quality.","Button sounds ","on","off","Loading available cameras…","Cameras unavailable: ","No rear camera available","Android did not expose a usable rear camera. Import a photo to adjust its corners.","Choose camera · RivoScan","Automatically choosing best camera","Switching to ","No working rear camera found. Import a photo instead.","RivoScan cannot open the rear camera. You can import a photo, adjust its corners and save a PDF.","Close","Capturing page…","Image error: ","Capture failed: ","Unable to import image: ","Photo stored in Documents/RivoScan","Photo captured without auto-crop.","Could not save photo: ","Adjust the corners: ","Import photo","Best camera"},
        {"تلقائي · أفضل كاميرا","نجرب كاميرا خلفية أخرى…"," · الحواف المباشرة"," · كاميرا عادية","حط الوثيقة داخل الإطار","صوّر · تحفظ في Documents/RivoScan","جرّ الزاوية الزرقاء · العدسة كتكبر الحافة بالضبط","عدة صفحات: صوّر الصفحات اللي بغيتي","صفحة واحدة: صور وحفظ"," جاهز","ϟ مطفأ","ϟ مشعل","الفلاش ما متاحش فهاد الكاميرا.","سكانير RivoScan الذكي","وجّه الكاميرا للورقة. جرّ الزوايا الأربعة بالعدسة المكبرة بدقة وحفظ. وضع عدة صفحات للتصوير المتتابع وHD للجودة.","أصوات الأزرار ","مفعلة","مطْفِيَة","كنحمّلو الكاميرات المتاحة…","الكاميرات غير متاحة: ","ما كايناش كاميرا خلفية متاحة","أندرويد ما عطاش كاميرا خلفية صالحة. تقدر تستورد صورة وتعدل الحواف.","اختار الكاميرا · RivoScan","كنختارو أحسن كاميرا تلقائياً","كنبدلو إلى ","ما لقيناش كاميرا خدامة. استورد صورة.","RivoScan ما قدرش يفتح الكاميرا. تقدر تستورد صورة وتعدل حوافها وتحفظ PDF.","إغلاق","كنصورو الصفحة…","خطأ فالصورة: ","فشل التصوير: ","تعذر استيراد الصورة: ","الصورة تحفظات في Documents/RivoScan","تصورت الصورة بلا قص تلقائي.","ما قدرناش نحفظو الصورة: ","راجع الزوايا: ","استيراد صورة","أحسن كاميرا"},
        {"Auto · meilleure caméra","Essai d’une autre caméra…"," · bords en direct"," · caméra simple","Alignez le document dans le cadre","Prenez une photo · sauvée dans Documents/RivoScan","Déplacez un coin bleu · la loupe montre le bord exact","Lot : capturez plusieurs pages","Simple : enregistrer une page"," prêt","ϟ Désactivé","ϟ Activé","Le flash est indisponible sur cette caméra.","Scanner intelligent RivoScan","Visez la page. Ajustez les quatre coins avec la loupe, puis enregistrez. Lot pour plusieurs pages ; HD privilégie la qualité.","Sons des boutons ","activés","désactivés","Chargement des caméras…","Caméras indisponibles : ","Aucune caméra arrière disponible","Android ne fournit pas de caméra arrière utilisable. Importez une photo.","Choisir la caméra · RivoScan","Choix automatique de la meilleure caméra","Passage à ","Aucune caméra ne fonctionne. Importez une photo.","RivoScan ne peut pas ouvrir la caméra. Importez une photo, recadrez et sauvez le PDF.","Fermer","Capture de la page…","Erreur image : ","Échec de capture : ","Importation impossible : ","Photo enregistrée dans Documents/RivoScan","Photo capturée sans recadrage.","Impossible d’enregistrer la photo : ","Ajustez les coins : ","Importer une photo","Meilleure caméra"},
        {"Auto · mejor cámara","Probando otra cámara…"," · bordes en directo"," · cámara básica","Alinea el documento en el marco","Haz una foto · se guarda en Documents/RivoScan","Arrastra un vértice azul · la lupa muestra el borde","Lote: captura todas las páginas","Única: guarda una página"," listo","ϟ Apagado","ϟ Encendido","El flash no está disponible.","Escáner inteligente RivoScan","Apunta a la hoja. Ajusta las cuatro esquinas con la lupa y guarda. Lote permite varias páginas y HD prioriza calidad.","Sonidos de botones ","activados","desactivados","Cargando cámaras…","Cámaras no disponibles: ","No hay cámara trasera disponible","Android no detecta una cámara trasera válida. Importa una foto.","Elegir cámara · RivoScan","Selección automática de la mejor cámara","Cambiando a ","No funciona ninguna cámara trasera. Importa una foto.","RivoScan no puede abrir la cámara. Importa una foto, ajústala y guarda PDF.","Cerrar","Capturando página…","Error de imagen: ","Error de captura: ","No se puede importar la imagen: ","Foto guardada en Documents/RivoScan","Foto tomada sin recorte automático.","No se pudo guardar la foto: ","Ajusta las esquinas: ","Importar foto","Mejor cámara"},
        {"Auto · beste Kamera","Andere Rückkamera wird getestet…"," · Live-Kanten"," · einfache Kamera","Dokument im Rahmen ausrichten","Foto aufnehmen · in Documents/RivoScan speichern","Blauen Eckpunkt ziehen · Lupe zeigt die genaue Kante","Stapel: mehrere Seiten aufnehmen","Einzeln: eine Seite speichern"," bereit","ϟ Aus","ϟ An","Blitz für diese Kamera nicht verfügbar.","RivoScan Smart-Scanner","Seite anvisieren. Vier Ecken mit der Lupe präzise ausrichten und speichern. Stapel für mehrere Seiten, HD für Qualität.","Tastentöne ","an","aus","Kameras werden geladen…","Kameras nicht verfügbar: ","Keine Rückkamera verfügbar","Android stellt keine nutzbare Rückkamera bereit. Foto importieren.","Kamera wählen · RivoScan","Beste Kamera wird automatisch gewählt","Wechsel zu ","Keine funktionierende Rückkamera. Foto importieren.","Kamera nicht verfügbar. Foto importieren, Ecken anpassen und PDF speichern.","Schließen","Seite wird aufgenommen…","Bildfehler: ","Aufnahme fehlgeschlagen: ","Bildimport fehlgeschlagen: ","Foto in Documents/RivoScan gespeichert","Foto ohne automatischen Zuschnitt.","Foto konnte nicht gespeichert werden: ","Ecken anpassen: ","Foto importieren","Beste Kamera"},
        {"Auto · melhor câmara","A testar outra câmara…"," · bordas em direto"," · câmara simples","Alinhe o documento no enquadramento","Tire foto · guardada em Documents/RivoScan","Arraste um canto azul · a lupa amplia a borda","Lote: capture várias páginas","Único: guarde uma página"," pronto","ϟ Desligado","ϟ Ligado","Flash não disponível nesta câmara.","Scanner inteligente RivoScan","Aponte para a página. Ajuste os quatro cantos com a lupa e guarde. Lote para várias páginas; HD para qualidade.","Sons dos botões ","ligados","desligados","A carregar câmaras…","Câmaras indisponíveis: ","Sem câmara traseira disponível","O Android não disponibilizou câmara traseira. Importe uma foto.","Escolher câmara · RivoScan","A escolher a melhor câmara","A mudar para ","Nenhuma câmara funcional. Importe uma foto.","O RivoScan não consegue abrir a câmara. Importe uma foto, ajuste e guarde PDF.","Fechar","A capturar página…","Erro de imagem: ","Falha na captura: ","Falha ao importar imagem: ","Foto guardada em Documents/RivoScan","Foto capturada sem corte automático.","Não foi possível guardar foto: ","Ajuste os cantos: ","Importar foto","Melhor câmara"},
        {"Auto · fotocamera migliore","Provo un’altra fotocamera…"," · bordi in diretta"," · fotocamera base","Allinea il documento nell’inquadratura","Scatta · salvato in Documents/RivoScan","Trascina un angolo blu · la lente ingrandisce il bordo","Sequenza: acquisisci più pagine","Singola: salva una pagina"," pronto","ϟ Spento","ϟ Acceso","Flash non disponibile.","Scanner intelligente RivoScan","Inquadra la pagina. Regola i quattro angoli con la lente e salva. Sequenza per più pagine; HD per la qualità.","Suoni dei pulsanti ","attivi","disattivi","Caricamento fotocamere…","Fotocamere non disponibili: ","Nessuna fotocamera posteriore","Android non rende disponibile una fotocamera posteriore. Importa foto.","Scegli fotocamera · RivoScan","Selezione automatica fotocamera migliore","Passaggio a ","Nessuna fotocamera funzionante. Importa foto.","RivoScan non apre la fotocamera. Importa una foto, regola gli angoli e salva PDF.","Chiudi","Acquisizione pagina…","Errore immagine: ","Acquisizione non riuscita: ","Importazione immagine fallita: ","Foto salvata in Documents/RivoScan","Foto scattata senza ritaglio.","Impossibile salvare foto: ","Regola gli angoli: ","Importa foto","Fotocamera migliore"}
    };
    private static final String[] ENHANCE_KEYS={
        "enhanceNext","enhanceTitle","enhanceOriginal","enhanceSmart","enhanceMagic",
        "enhanceShadow","enhanceWhiteboard","enhanceBW","enhanceHint",
        "enhanceBack","enhanceCompare","enhanceDone","enhancePreparing",
        "enhanceSaving","enhanceFailed"
    };
    private static final String[][] ENHANCE_TEXT={
        {"Next: enhance","Clean up your scan","Original","Enhance","Magic","No shadow",
         "Whiteboard","B&W","Choose a filter, compare with original, then tap ✓ to save.",
         "Edges","Compare","Save","Preparing straightened page…",
         "Cleaning full-quality page…","Enhancement preview unavailable. Try Original."},
        {"التالي: تحسين","تنقية الوثيقة","الأصلية","تحسين","تحسين قوي","حذف الظلال",
         "السبورة","أبيض وأسود","اختار التحسين وقارن بالأصل، ومن بعد اضغط ✓ للحفظ.",
         "الحواف","مقارنة","حفظ","كنقوّمو الصفحة…",
         "كننقّيو الصفحة بالجودة العالية…","المعاينة ما خداماش. اختار الأصلية."},
        {"Suivant : améliorer","Nettoyer le scan","Original","Améliorer","Intensif","Sans ombres",
         "Tableau blanc","N&B","Choisissez le filtre, comparez puis validez avec ✓.",
         "Bords","Comparer","Enregistrer","Redressement de la page…",
         "Nettoyage en qualité maximale…","Aperçu impossible. Essayez Original."},
        {"Siguiente: mejorar","Limpiar escaneo","Original","Mejorar","Intenso","Sin sombras",
         "Pizarra","B/N","Elige un filtro, compara y toca ✓ para guardar.",
         "Bordes","Comparar","Guardar","Enderezando página…",
         "Limpiando con máxima calidad…","Vista previa no disponible. Prueba Original."},
        {"Weiter: verbessern","Scan bereinigen","Original","Verbessern","Intensiv","Ohne Schatten",
         "Whiteboard","S/W","Filter wählen, Original vergleichen, mit ✓ speichern.",
         "Kanten","Vergleichen","Speichern","Seite wird begradigt…",
         "Seite wird in hoher Qualität verbessert…","Keine Vorschau. Original wählen."},
        {"Seguinte: melhorar","Limpar digitalização","Original","Melhorar","Intenso","Sem sombras",
         "Quadro branco","P&B","Escolha filtro, compare e toque ✓ para guardar.",
         "Bordas","Comparar","Guardar","A endireitar a página…",
         "A melhorar a página…","Prévia indisponível. Experimente Original."},
        {"Avanti: migliora","Ripulisci scansione","Originale","Migliora","Intenso","Senza ombre",
         "Lavagna","B/N","Scegli filtro, confronta e tocca ✓ per salvare.",
         "Bordi","Confronta","Salva","Raddrizzamento pagina…",
         "Miglioramento ad alta qualità…","Anteprima non disponibile. Prova Original."}
    };
    private static final String[] AUTO_KEYS={"autoCleanSave","enhanceFilters","autoCleaning","enhanceAuto"};
    private static final String[][] AUTO_TEXT={
        {"Clean & Save","Filters","Straightening and cleaning the document…","Auto Clean"},
        {"تنقية وحفظ","الفلاتر","كنقومو الورقة وكننقيو الخطوط والكاشيات…","تنقية تلقائية"},
        {"Nettoyer et enregistrer","Filtres","Redressement et nettoyage du document…","Nettoyage auto"},
        {"Limpiar y guardar","Filtros","Enderezando y limpiando el documento…","Limpieza automática"},
        {"Bereinigen und speichern","Filter","Dokument wird begradigt und bereinigt…","Automatisch"},
        {"Limpar e guardar","Filtros","A endireitar e limpar o documento…","Limpeza automática"},
        {"Pulisci e salva","Filtri","Raddrizzamento e pulizia del documento…","Pulizia automatica"}
    };
    static String get(String language,String key){
        int lang=0;
        if("ar".equals(language))lang=1;else if("fr".equals(language))lang=2;
        else if("es".equals(language))lang=3;else if("de".equals(language))lang=4;
        else if("pt".equals(language))lang=5;else if("it".equals(language))lang=6;
        if("notFound".equals(key))return new String[]{
            "Edges not detected. Drag the four blue points around your document.",
            "ما تعرفناش على الحواف. جرّ الزوايا الزرقاء الأربعة حول الوثيقة.",
            "Bords non détectés. Déplacez les quatre points bleus autour du document.",
            "Bordes no detectados. Ajusta los cuatro puntos azules.",
            "Kanten nicht erkannt. Vier blaue Punkte an die Dokumentecken ziehen.",
            "Bordas não detetadas. Ajuste os quatro pontos azuis.",
            "Bordi non trovati. Sposta i quattro punti blu."
        }[lang];
        if("found".equals(key))return new String[]{
            "Check the blue corners and adjust if needed.",
            "راجع الزوايا الزرقاء وعدّلها إلا احتاج الأمر.",
            "Vérifiez les coins bleus et ajustez-les si nécessaire.",
            "Comprueba los bordes azules y ajusta si hace falta.",
            "Blaue Ecken prüfen und bei Bedarf korrigieren.",
            "Verifique os cantos azuis e ajuste se necessário.",
            "Controlla gli angoli blu e correggili se necessario."
        }[lang];
        if("pageStored".equals(key))return new String[]{
            "Page saved in Documents/RivoScan",
            "الصفحة تحفظات في Documents/RivoScan",
            "Page enregistrée dans Documents/RivoScan",
            "Página guardada en Documents/RivoScan",
            "Seite in Documents/RivoScan gespeichert",
            "Página guardada em Documents/RivoScan",
            "Pagina salvata in Documents/RivoScan"
        }[lang];
        if("pageNotStored".equals(key))return new String[]{
            "Image backup failed; the PDF save will still be attempted.",
            "ما تحفظاتش نسخة الصورة؛ غادي نحاولو نحفظو PDF.",
            "Échec de la copie image ; l'enregistrement PDF sera essayé.",
            "No se pudo guardar la imagen; se intentará guardar PDF.",
            "Bildkopie fehlgeschlagen; PDF-Speicherung wird versucht.",
            "Falha ao guardar imagem; será tentado guardar PDF.",
            "Copia immagine non riuscita; si proverà a salvare il PDF."
        }[lang];
        if("openDocument".equals(key))return new String[]{"Open RivoScan document","فتح وثيقة RivoScan","Ouvrir le document RivoScan","Abrir documento RivoScan","RivoScan-Dokument öffnen","Abrir documento RivoScan","Apri documento RivoScan"}[lang];
        if("shareDocument".equals(key))return new String[]{"Share RivoScan document","مشاركة وثيقة RivoScan","Partager le document RivoScan","Compartir documento RivoScan","RivoScan-Dokument teilen","Partilhar documento RivoScan","Condividi documento RivoScan"}[lang];
        for(int i=0;i<AUTO_KEYS.length;i++)if(AUTO_KEYS[i].equals(key))return AUTO_TEXT[lang][i];
        for(int i=0;i<ENHANCE_KEYS.length;i++)if(ENHANCE_KEYS[i].equals(key))return ENHANCE_TEXT[lang][i];
        for(int i=0;i<KEYS.length;i++)if(KEYS[i].equals(key))return VALUES[lang][i];
        for(int i=0;i<EXTRA_KEYS.length;i++)if(EXTRA_KEYS[i].equals(key))return EXTRA_VALUES[lang][i];
        return key;
    }
}