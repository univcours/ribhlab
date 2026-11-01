// Version-aware release notes: describe verified code without promising semantic or generative AI.
export const changesForVersion=(language='en')=>{
 const data={
  "en": {
    "title": "What's New in RivoScan",
    "subtitle": "Release",
    "close": "Got it",
    "items": [
      "Colored-ink cleanup: brush only the area you own and choose automatic colored-ink detection or blue, red, green and light-gray selection.",
      "Smart Erase now chooses more consistent image-boundary colors to reduce dark ink smearing when repairing an annotation.",
      "Restore Photo repairs isolated dust pixels in otherwise uniform areas without replacing a connected text stroke.",
      "Undo now removes an entire brush gesture. Each stroke keeps its selected color when you change tools.",
      "Book Scan estimates left and right page curvature independently; manual correction and original copies remain available."
    ],
    "limits": "Color selection is not automatic handwriting or watermark recognition. Restoration is not generative AI; complex folds and damaged photos require manual review. AI Chat/Solver require explicit consent, network and a personal API key."
  },
  "ar": {
    "title": "شنو الجديد فـRivoScan",
    "subtitle": "النسخة",
    "close": "فهمت",
    "items": [
      "حذف الحبر الملون داخل المنطقة اللي كتحدد بالفرشاة، مع اختيار اللون تلقائياً داخل التحديد أو اختيار الأزرق والأحمر والأخضر والرمادي الفاتح.",
      "Smart Erase ولى كيختار لون الخلفية الأقرب لتقليل تشويه الحروف اللي حدا العلامة الممسوحة.",
      "Restore Photo كيصلح نقط الغبار الصغيرة المعزولة مع الحفاظ على الخطوط المتصلة.",
      "التراجع كيرجع الضربة كاملة، وكل ضربة كتبقى محتافظـة باللون اللي تختار ليها.",
      "Book Scan كيقدّر انحناء الصفحة اليمنى واليسرى بوحدها، مع الاحتفاظ بالتصحيح اليدوي والصور الأصلية."
    ],
    "limits": "اختيار اللون ماشي تعرّف آلي على الكتابة اليدوية أو العلامات المائية. الترميم ماشي AI توليدي؛ الطيات والصور المتضررة خاصها مراجعة. AI Chat وSolver كيحتاجو موافقة واتصال ومفتاح API شخصي."
  },
  "fr": {
    "title": "Nouveautés RivoScan",
    "subtitle": "Version",
    "close": "Compris",
    "items": [
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
      "Selezione dell'inchiostro colorato solo nell'area disegnata, automatica per colore o blu/rosso/verde/grigio chiaro.",
      "Smart Erase privilegia bordi di colore simile per evitare sbavature sul testo vicino.",
      "Restore Photo ripara piccoli punti di polvere isolati preservando le linee continue.",
      "Annulla rimuove un intero gesto; ogni tratto conserva il colore iniziale.",
      "Book Scan stima separatamente la curvatura delle due pagine e permette correzioni manuali."
    ],
    "limits": "La selezione cromatica non riconosce automaticamente scrittura o filigrane. Il restauro non è generativo; verificare i risultati. L'IA esterna richiede consenso e chiave API."
  }
};
 return data[language]||data.en;
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
 overlay.append(panel);document.body.append(overlay);
 ok.focus();
 return close;
}
