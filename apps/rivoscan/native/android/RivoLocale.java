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
            "Page saved in Download/RivoScan",
            "الصفحة تحفظات في Download/RivoScan",
            "Page enregistrée dans Download/RivoScan",
            "Página guardada en Download/RivoScan",
            "Seite in Download/RivoScan gespeichert",
            "Página guardada em Download/RivoScan",
            "Pagina salvata in Download/RivoScan"
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
        for(int i=0;i<KEYS.length;i++)if(KEYS[i].equals(key))return VALUES[lang][i];
        return key;
    }
}