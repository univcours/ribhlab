import './style.css';
import './theme-brand.css';
import { version as appVersion } from '../package.json';
import {readScanPrefs,updateScanPref,scanPrefsText,SCAN_PREF_FIELDS,formatScanSettingValue} from './scanner-settings.js';
import { parsePages } from './pdf-utils.js';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { recognize } from 'tesseract.js';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';
import { initPeerTransfer } from './file-transfer.js';
import { toolText, label as L, localizeOptions } from './rivo-i18n.js';
import { createDocumentViewer } from './document-viewer.js';
import { createLibraryBulk } from './library-bulk.js';
import { openScanEditor } from './scan-editor.js';
import { openPageManager } from './page-manager.js';
import { exportToolFile } from './tool-exports.js';
import {openBarcodeScanner} from './barcode-scanner.js';
import {openIDPhotoMaker} from './id-photo-maker.js';
import {openBookSplitter} from './book-split.js';
import {openCountCam} from './count-cam.js';
import {openPDFLock} from './pdf-lock.js';
import {openPhotoTranslation} from './photo-translation.js';
import {openFormulaReader} from './formula-ocr.js';
import {openWhatsNew,shouldShowReleaseNotes} from './whats-new.js';
import { toolGroups,hubSpecial,hubGroupLabel,hubLabel } from './tools-hub.js';
import { localizeStaticUI, translateStatus } from './i18n-extra.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const RivoLiveScanner = registerPlugin('RivoLiveScanner');
const RivoDocuments = registerPlugin('RivoDocuments');
if(Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android'){
  document.body.classList.add('rivo-native-android');
  // Keep the real Android status bar on screen; do not draw the app under it.
  StatusBar.show().then(()=>StatusBar.setOverlaysWebView({overlay:false}))
    .then(()=>StatusBar.setBackgroundColor({color:'#FFFFFF'}))
    .then(()=>StatusBar.setStyle({style:Style.Light}))
    .catch(error=>console.warn('Android status bar configuration:',error));
}

const icons = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
  scan:'<path d="M7 3H5a2 2 0 0 0-2 2v2m14-4h2a2 2 0 0 1 2 2v2M3 17v2a2 2 0 0 0 2 2h2m14-4v2a2 2 0 0 1-2 2h-2M7 12h10"/>',
  merge:'<path d="M8 3h7l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 3v5h5M3 12h10M3 16h10"/>',
  split:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M8 8h1m6 8h1"/>',
  rotate:'<path d="M3 11a9 9 0 1 1 2 6"/><path d="M3 4v7h7"/>',
  delete:'<path d="M3 6h18m-2 0-1 15H6L5 6m4 0V3h6v3m-5 4v7m4-7v7"/>',
  reorder:'<path d="M4 6h13M4 12h13M4 18h13m2-12 2-2m-2 8 2-2m-2 8 2-2"/>',
  numbers:'<path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="m9 10 2-1v7m-3 0h6"/>',
  watermark:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m6 17 12-10M8 7h4m-4 4h2"/>',
  text:'<path d="M4 7V4h16v3M12 4v16m-4 0h8"/>',
  sign:'<path d="M3 17c4-8 5 3 9-3 3-5 4 6 9 1M3 21h18"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m21 15-6-6L5 21"/>',
  convert:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  ocr:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10m-5 0v10M7 18h10"/>',
  compress:'<path d="M8 3v6H3m13-6v6h5M8 21v-6H3m13 6v-6h5M8 8l-5-5m13 5 5-5M8 16l-5 5m13-5 5 5"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v.01"/>',
  shield:'<path d="m12 22 8-4V6l-8-4-8 4v12z"/><path d="m8 12 3 3 5-6"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  file:'<path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h6"/>',
  camera:'<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check:'<path d="m4 12 5 5 11-11"/>',
  sparkle:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  lock:'<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
  idcard:'<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4 16c1-2 6-2 8 0m3-7h4m-4 4h4"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3c0-5 16-5 16 0v3"/>',
  more:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'
};
const ico = (name,size=20) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.file}</svg>`;
const tools = [
 {id:'scan',category:'create',icon:'scan',color:'violet',name:'Smart Scanner',desc:'See live document borders, drag the four corners and save cropped PDFs',accept:'image/*',multiple:true},
 {id:'bundle',category:'create',icon:'merge',color:'sky',name:'Combine Documents',desc:'Mix scanned photos and PDF files in a single PDF',accept:'.pdf,application/pdf,image/*',multiple:true},
 {id:'shareFiles',category:'convert',icon:'upload',color:'green',name:'Share Any File',desc:'Send PDFs, images, ZIPs, documents and more',accept:'*/*',multiple:true},
 {id:'peerTransfer',category:'convert',icon:'convert',color:'sky',name:'Direct File Transfer',desc:'Encrypted phone-to-phone sharing via pairing codes (beta)',accept:'*/*',multiple:true},
 {id:'images',category:'convert',icon:'image',color:'orange',name:'Images to PDF',desc:'Combine JPG, PNG and photos into PDFs',accept:'image/*',multiple:true},
 {id:'merge',category:'organize',icon:'merge',color:'sky',name:'Merge PDF',desc:'Combine multiple documents into one',accept:'.pdf,application/pdf',multiple:true},
 {id:'split',category:'organize',icon:'split',color:'green',name:'Extract Pages',desc:'Extract ranges from a PDF',accept:'.pdf,application/pdf'},
 {id:'rotate',category:'organize',icon:'rotate',color:'orange',name:'Rotate Pages',desc:'Rotate selected pages in seconds',accept:'.pdf,application/pdf'},
 {id:'delete',category:'organize',icon:'delete',color:'pink',name:'Delete Pages',desc:'Remove unwanted document pages',accept:'.pdf,application/pdf'},
 {id:'reorder',category:'organize',icon:'reorder',color:'violet',name:'Reorder Pages',desc:'Put pages into any custom order',accept:'.pdf,application/pdf'},
 {id:'numbers',category:'edit',icon:'numbers',color:'sky',name:'Page Numbers',desc:'Number every page automatically',accept:'.pdf,application/pdf'},
 {id:'watermark',category:'edit',icon:'watermark',color:'violet',name:'Watermark PDF',desc:'Add a confidential or branded mark',accept:'.pdf,application/pdf'},
 {id:'text',category:'edit',icon:'text',color:'green',name:'Add Text',desc:'Place a text note on each page',accept:'.pdf,application/pdf'},
 {id:'sign',category:'edit',icon:'sign',color:'pink',name:'Sign PDF',desc:'Draw and place your own signature',accept:'.pdf,application/pdf'},
 {id:'pdftoimages',category:'convert',icon:'convert',color:'sky',name:'PDF to JPG',desc:'Export each page as an image ZIP',accept:'.pdf,application/pdf'},
 {id:'extractText',category:'convert',icon:'text',color:'green',name:'PDF to Text',desc:'Get selectable text from digital PDFs',accept:'.pdf,application/pdf'},
 {id:'ocr',category:'convert',icon:'ocr',color:'violet',name:'OCR Text Reader',desc:'Recognize writing in scanned files',accept:'.pdf,.png,.jpg,.jpeg,application/pdf,image/*'},
 {id:'compress',category:'edit',icon:'compress',color:'orange',name:'Compress Scans',desc:'Shrink scanned PDFs by recompressing pages',accept:'.pdf,application/pdf'},
 {id:'metadata',category:'edit',icon:'shield',color:'green',name:'Clear Metadata',desc:'Remove author, title and creator details',accept:'.pdf,application/pdf'}
];
const translations = {
  en:{welcome:'Welcome to RivoScan',hero:'Your documents, done.',desc:'Scan, edit, convert and sign PDFs in one beautifully simple workspace. Private by design.',start:'Smart Scan · Auto Crop',all:'All tools',create:'Scan & create',organize:'Organize pages',edit:'Edit & sign',convert:'Convert & extract',quick:'Your PDF toolkit',select:'Select files',upload:'Tap to choose files',drop:'Choose documents from your device',ready:'Ready to process',run:'Process & save',secure:'Private by design',privacy:'Your documents are processed on this device. No account or document upload required for core tools.',home:'Overview',files:'Recent activity',soon:'More tools coming',settings:'Languages',unavailable:'This AI feature needs an online service and is not included in this build.'},
  fr:{welcome:'Bienvenue sur RivoScan',hero:'Vos documents, simplifiés.',desc:'Numérisez, modifiez, convertissez et signez vos PDF. Respect de votre vie privée.',start:'Scanner intelligent',all:'Tous les outils',create:'Scanner et créer',organize:'Organiser',edit:'Modifier et signer',convert:'Convertir et extraire',quick:'Vos outils PDF',select:'Choisir les fichiers',upload:'Appuyez pour choisir',drop:'Sélectionner des documents',ready:'Prêt',run:'Traiter et enregistrer',secure:'Confidentialité',privacy:'Les documents sont traités sur cet appareil, sans envoi sur serveur pour les outils de base.',home:'Accueil',files:'Activité récente',soon:'À venir',settings:'Langues',unavailable:'Cette fonction nécessite un service en ligne.'},
  ar:{welcome:'مرحباً بك في RivoScan',hero:'مستنداتك، بكل سهولة.',desc:'امسح وعدّل وحوّل ووقّع ملفات PDF بأدوات متكاملة تحترم خصوصيتك.',start:'السكانير الذكي',all:'جميع الأدوات',create:'المسح والإنشاء',organize:'تنظيم الصفحات',edit:'التحرير والتوقيع',convert:'التحويل والاستخراج',quick:'أدوات PDF',select:'اختر الملفات',upload:'اضغط لاختيار الملفات',drop:'اختر مستندات من جهازك',ready:'جاهز للمعالجة',run:'معالجة وحفظ',secure:'خصوصية مستنداتك',privacy:'تُعالج ملفاتك على جهازك دون رفعها لخادم في الأدوات الأساسية.',home:'الرئيسية',files:'النشاط الأخير',soon:'قريباً',settings:'اللغات',unavailable:'تحتاج هذه الوظيفة إلى خدمة إلكترونية غير مدمجة حالياً.'},
  es:{welcome:'Bienvenido a RivoScan',hero:'Tus documentos, resueltos.',desc:'Escanea, edita, convierte y firma PDF de forma privada.',start:'Escáner inteligente',all:'Todas las herramientas',create:'Escanear y crear',organize:'Organizar',edit:'Editar y firmar',convert:'Convertir',quick:'Herramientas PDF',select:'Seleccionar archivos',upload:'Toca para elegir',drop:'Elige documentos',ready:'Listo',run:'Procesar y guardar',secure:'Privacidad',privacy:'Tus documentos se procesan en este dispositivo.',home:'Inicio',files:'Actividad reciente',soon:'Próximamente',settings:'Idiomas'},
  de:{welcome:'Willkommen bei RivoScan',hero:'Dokumente. Erledigt.',desc:'PDF scannen, bearbeiten, konvertieren und unterschreiben.',start:'Smart-Scan',all:'Alle Werkzeuge',create:'Scannen & erstellen',organize:'Organisieren',edit:'Bearbeiten',convert:'Konvertieren',quick:'PDF-Werkzeuge',select:'Dateien auswählen',upload:'Dateien wählen',drop:'Dokumente wählen',ready:'Bereit',run:'Verarbeiten & speichern',secure:'Datenschutz',privacy:'Dokumente werden lokal auf diesem Gerät verarbeitet.',home:'Start',files:'Letzte Aktivität',soon:'Demnächst',settings:'Sprachen'},
  pt:{welcome:'Bem-vindo ao RivoScan',hero:'Documentos resolvidos.',desc:'Digitalize, edite, converta e assine PDFs com privacidade.',start:'Digitalização inteligente',all:'Todas as ferramentas',create:'Digitalizar e criar',organize:'Organizar',edit:'Editar e assinar',convert:'Converter',quick:'Ferramentas PDF',select:'Selecionar ficheiros',upload:'Escolher ficheiros',drop:'Escolha documentos',ready:'Pronto',run:'Processar e guardar',secure:'Privacidade',privacy:'Os documentos são processados no dispositivo.',home:'Início',files:'Atividade recente',soon:'Brevemente',settings:'Idiomas'},
  it:{welcome:'Benvenuto su RivoScan',hero:'Documenti, risolti.',desc:'Scansiona, modifica, converti e firma PDF in privato.',start:'Scansione intelligente',all:'Tutti gli strumenti',create:'Scansiona e crea',organize:'Organizza',edit:'Modifica e firma',convert:'Converti',quick:'Strumenti PDF',select:'Seleziona file',upload:'Scegli file',drop:'Seleziona documenti',ready:'Pronto',run:'Elabora e salva',secure:'Privacy',privacy:'I documenti vengono elaborati sul dispositivo.',home:'Home',files:'Attività recente',soon:'In arrivo',settings:'Lingue'}
};
let language = localStorage.getItem('rivo-language') || 'en';
if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){
  RivoDocuments.setLanguage({language}).catch(error=>console.warn('Rivo document locale:',error));
}
let activeTool = null;
let soundsEnabled = localStorage.getItem('rivo-sounds') !== 'off';
const soundWords={
  en:['Button sounds','Play a different subtle sound for scan, save and navigation'],
  ar:['أصوات الأزرار','أصوات خفيفة ومختلفة للتصوير والحفظ والتنقل'],
  fr:['Sons des boutons','Sons discrets pour scanner, enregistrer et naviguer'],
  es:['Sonidos de botones','Sonidos suaves al escanear, guardar y navegar'],
  de:['Tastentöne','Leise Töne beim Scannen, Speichern und Navigieren'],
  pt:['Sons dos botões','Sons leves ao digitalizar, guardar e navegar'],
  it:['Suoni dei pulsanti','Suoni discreti per scansione, salvataggio e navigazione']
};
const soundWord=(i)=>(soundWords[language]||soundWords.en)[i];
function soundFeedback(kind='tap'){
  if(!soundsEnabled)return;
  if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android' &&
     Capacitor.isPluginAvailable('RivoLiveScanner')){
    RivoLiveScanner.playFeedback({kind}).catch(()=>{});
  }
}
function soundForButton(button){
  if(button.hasAttribute('data-live-camera')||button.id==='smart-scanner')return 'camera';
  if(button.id==='process'||button.hasAttribute('data-doc-share'))return 'saved';
  if(button.hasAttribute('data-tool'))return 'tool';
  return 'tap';
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(button && button.id!=='sound-toggle')soundFeedback(soundForButton(button));
},true);

let files = [];
let scanRotations = [];
let busy = false;
let history = [];
try { history = JSON.parse(localStorage.getItem('rivo-history') || '[]'); if (!Array.isArray(history)) history = []; } catch { history = []; }
let previewURLs = [];
let closeTransfer = null;
let libraryItems = [], libraryLoading = false, libraryError = '';
const docViewerUI=createDocumentViewer({
  bridge:RivoDocuments,
  getLanguage:()=>language,
  onChanged:async()=>{
    await loadLibrary(false);
    if(activeTool?.id==='library')refreshVisibleLibrary();
    else if(!activeTool){
      const home=document.getElementById('home-recents');
      if(home)home.innerHTML=recentDocuments();
    }
  },
  onEdit:async(tool,doc,bytes)=>{
    if(tool==='managePages'&&(/\.pdf$/i.test(doc.name)||/pdf/.test(doc.mimeType||''))){
      if(!bytes)throw Error('PDF too large for page editor');
      await openPageManager({file:new File([bytes],doc.name,{type:'application/pdf'}),
       getLanguage:()=>language,onSave:saveOut,onDone:async()=>{await loadLibrary(false);openLibrary()},
       onError:message=>toast(message,true)});return;
    }
    if(tool==='enhance'&&/^image\//.test(doc.mimeType||'')){
      await openScanEditor({
        doc,bridge:RivoDocuments,getLanguage:()=>language,
        onSave:saveOut,onCrop:d=>openLiveScanner({imageUri:d.uri}),
        onRetake:()=>openLiveScanner(),
        onRefresh:async()=>{
          await loadLibrary(false);
          if(activeTool?.id==='library')refreshVisibleLibrary();
          else{const rows=document.getElementById('home-recents');if(rows)rows.innerHTML=recentDocuments();}
        },
        notify:toast
      });
      return;
    }
    if(tool==='scan'&&/^image\//.test(doc.mimeType||'')){
      await openLiveScanner({imageUri:doc.uri});return;
    }
    if(!bytes)throw new Error(lt('error'));
    openTool(tool);
    files=[new File([bytes],doc.name,{type:doc.mimeType||'application/pdf'})];
    scanRotations=[0];updateFileDisplay();
  },
  onError:message=>toast(message,true),
  onShare:doc=>bulkUI.share([doc])
});
const bulkUI=createLibraryBulk({
  bridge:RivoDocuments,getLanguage:()=>language,getItems:()=>libraryItems,
  onRefresh:async()=>{
    await loadLibrary(false);refreshVisibleLibrary();
    const recents=document.getElementById('home-recents');if(recents)recents.innerHTML=recentDocuments();
  },
  onPreview:doc=>docViewerUI.open(doc),
  onOpenLibrary:()=>openLibrary(),
  onDirectTransfer:async docs=>{
    openTool('peerTransfer');
    const chooser=document.getElementById('peer-files');
    if(!chooser||typeof DataTransfer==='undefined'||!Array.isArray(docs))return;
    const staged=new DataTransfer();
    let total=0;
    for(const doc of docs){
      if((doc.size||0)>15*1024*1024||total+(doc.size||0)>60*1024*1024)continue;
      try{
        const result=await RivoDocuments.readFile({uri:doc.uri});
        const raw=atob(result.base64||'');
        const bytes=new Uint8Array(raw.length);
        for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
        staged.items.add(new File([bytes],doc.name,{type:doc.mimeType||'application/octet-stream'}));
        total+=bytes.length;
      }catch(error){console.warn('Direct transfer preselection:',error);}
    }
    chooser.files=staged.files;
    if(staged.files.length)toast(staged.files.length+' '+dl('files')+' ✓');
  },
  onEdit:async doc=>{await docViewerUI.open(doc);document.querySelector('.doc-action.doc-edit')?.click()},
  onRename:async doc=>{
    await docViewerUI.open(doc);
    document.querySelector('.doc-detail-actions button:nth-child(3)')?.click();
  },
  showBusy,progress,clearBusy,saveOut,toast
});
let libraryFilter = 'all', librarySort = 'newest', libraryLayout = 'list';
const uiText={
 en:{home:'Home',documents:'Documents',tools:'Tools',me:'Me',search:'Search your saved documents',recent:'Recent documents',seeAll:'See all',quick:'Quick tools',safe:'Private, saved on your phone',scan:'Smart Scan',pdf:'PDF Tools',import:'Import images',merge:'Merge documents',welcome:'Scan it. Find it. Share it.',myFiles:'My files',settings:'Settings',device:'Saved in Documents/RivoScan',privacy:'Your documents stay on your phone',noAccount:'No account needed',general:'General',language:'App language',about:'About RivoScan',help:'Help & support',storage:'Storage',openDocuments:'Open My Documents',allFiles:'All files',pdfFiles:'PDF',images:'Images',sort:'Sort',newest:'Newest first',oldest:'Oldest first',name:'Name',size:'Size',list:'List',grid:'Grid',noRecent:'Your saved documents appear here after your first scan.'},
 ar:{home:'الرئيسية',documents:'وثائقي',tools:'الأدوات',me:'حسابي',search:'قلب على الوثائق ديالك',recent:'آخر الوثائق',seeAll:'عرض الكل',quick:'أدوات سريعة',safe:'الوثائق محفوظة فالهاتف',scan:'سكانير ذكي',pdf:'أدوات PDF',import:'استيراد صور',merge:'جمع الوثائق',welcome:'صوّر، حفظ، وشارك بسهولة',myFiles:'ملفاتي',settings:'الإعدادات',device:'محفوظة في Documents/RivoScan',privacy:'وثائقك كتبقى فالهاتف',noAccount:'ما محتاجش حساب',general:'الإعدادات العامة',language:'لغة التطبيق',about:'حول RivoScan',help:'المساعدة',storage:'التخزين',openDocuments:'فتح وثائقي',allFiles:'جميع الملفات',pdfFiles:'PDF',images:'الصور',sort:'الترتيب',newest:'الأحدث',oldest:'الأقدم',name:'الاسم',size:'الحجم',list:'قائمة',grid:'شبكة',noRecent:'الوثائق ديالك غادي تبان هنا من بعد أول سكان.'},
 fr:{home:'Accueil',documents:'Documents',tools:'Outils',me:'Mon espace',search:'Chercher un document',recent:'Documents récents',seeAll:'Tout voir',quick:'Outils rapides',safe:'Fichiers enregistrés sur le téléphone',scan:'Scanner',pdf:'Outils PDF',import:'Importer images',merge:'Fusionner documents',welcome:'Scannez. Retrouvez. Partagez.',myFiles:'Mes fichiers',settings:'Paramètres',device:'Enregistrés dans Documents/RivoScan',privacy:'Vos documents restent sur votre téléphone',noAccount:'Aucun compte nécessaire',general:'Général',language:'Langue',about:'À propos de RivoScan',help:'Aide',storage:'Stockage',openDocuments:'Ouvrir les documents',allFiles:'Tous',pdfFiles:'PDF',images:'Images',sort:'Trier',newest:'Plus récents',oldest:'Plus anciens',name:'Nom',size:'Taille',list:'Liste',grid:'Grille',noRecent:'Vos documents apparaîtront ici après le premier scan.'},
 es:{home:'Inicio',documents:'Documentos',tools:'Herramientas',me:'Mi espacio',search:'Buscar documentos',recent:'Documentos recientes',seeAll:'Ver todo',quick:'Accesos rápidos',safe:'Guardado en tu teléfono',scan:'Escanear',pdf:'Herramientas PDF',import:'Importar imágenes',merge:'Combinar documentos',welcome:'Escanea. Guarda. Comparte.',myFiles:'Mis archivos',settings:'Configuración',device:'Guardados en Documents/RivoScan',privacy:'Tus documentos quedan en tu teléfono',noAccount:'No necesitas cuenta',general:'General',language:'Idioma',about:'Acerca de RivoScan',help:'Ayuda',storage:'Almacenamiento',openDocuments:'Abrir documentos',allFiles:'Todos',pdfFiles:'PDF',images:'Imágenes',sort:'Ordenar',newest:'Recientes',oldest:'Antiguos',name:'Nombre',size:'Tamaño',list:'Lista',grid:'Cuadrícula',noRecent:'Los documentos aparecerán aquí al escanear.'},
 de:{home:'Start',documents:'Dokumente',tools:'Werkzeuge',me:'Profil',search:'Dokumente suchen',recent:'Letzte Dokumente',seeAll:'Alle',quick:'Schnellzugriff',safe:'Auf dem Telefon gespeichert',scan:'Scannen',pdf:'PDF-Werkzeuge',import:'Bilder importieren',merge:'Dokumente kombinieren',welcome:'Scannen. Finden. Teilen.',myFiles:'Meine Dateien',settings:'Einstellungen',device:'Documents/RivoScan',privacy:'Dateien bleiben auf deinem Telefon',noAccount:'Kein Konto nötig',general:'Allgemein',language:'Sprache',about:'Über RivoScan',help:'Hilfe',storage:'Speicher',openDocuments:'Dokumente öffnen',allFiles:'Alle',pdfFiles:'PDF',images:'Bilder',sort:'Sortieren',newest:'Neueste',oldest:'Älteste',name:'Name',size:'Größe',list:'Liste',grid:'Raster',noRecent:'Deine Scans erscheinen hier.'},
 pt:{home:'Início',documents:'Documentos',tools:'Ferramentas',me:'Perfil',search:'Pesquisar documentos',recent:'Documentos recentes',seeAll:'Ver todos',quick:'Ferramentas rápidas',safe:'Guardado no telemóvel',scan:'Digitalizar',pdf:'Ferramentas PDF',import:'Importar imagens',merge:'Combinar documentos',welcome:'Digitalize. Guarde. Partilhe.',myFiles:'Os meus ficheiros',settings:'Definições',device:'Documents/RivoScan',privacy:'Documentos no seu telemóvel',noAccount:'Sem conta',general:'Geral',language:'Idioma',about:'Sobre RivoScan',help:'Ajuda',storage:'Armazenamento',openDocuments:'Abrir documentos',allFiles:'Todos',pdfFiles:'PDF',images:'Imagens',sort:'Ordenar',newest:'Recentes',oldest:'Antigos',name:'Nome',size:'Tamanho',list:'Lista',grid:'Grelha',noRecent:'Os seus scans aparecem aqui.'},
 it:{home:'Home',documents:'Documenti',tools:'Strumenti',me:'Profilo',search:'Cerca documenti',recent:'Documenti recenti',seeAll:'Vedi tutti',quick:'Strumenti rapidi',safe:'Salvati sul telefono',scan:'Scansiona',pdf:'Strumenti PDF',import:'Importa immagini',merge:'Unisci documenti',welcome:'Scansiona. Trova. Condividi.',myFiles:'I miei file',settings:'Impostazioni',device:'Documents/RivoScan',privacy:'I documenti rimangono sul telefono',noAccount:'Nessun account richiesto',general:'Generale',language:'Lingua',about:'Informazioni',help:'Aiuto',storage:'Memoria',openDocuments:'Apri documenti',allFiles:'Tutti',pdfFiles:'PDF',images:'Immagini',sort:'Ordina',newest:'Recenti',oldest:'Meno recenti',name:'Nome',size:'Dimensione',list:'Elenco',grid:'Griglia',noRecent:'Le tue scansioni appariranno qui.'}
};
const ut=key=>uiText[language]?.[key]||uiText.en[key]||key;
const tn=t=>toolText(language,t.id,'name');
const td=t=>toolText(language,t.id,'desc');
const lt=key=>L(language,key);
const vivoFolderLabel=()=>({en:'Open phone folder',ar:'فتح المجلد فالهاتف',fr:'Ouvrir le dossier',es:'Abrir carpeta',de:'Ordner öffnen',pt:'Abrir pasta',it:'Apri cartella'})[language]||'Open phone folder';

const localizeOptionMarkup=markup=>localizeOptions(language,markup);
const homeVisualText={"en":{"search":"Search documents","id":"ID Cards","sign":"Sign PDF","all":"All","pdf":"PDF Tools","extract":"Extract Text","share":"Share","savePdf":"Save as PDF","view":"View","open":"Open","recentSubtitle":"Your recent scans and files, ready when you need them","hold":"Long press a document to select several","results":"Search results","noResults":"No matching documents yet","toolsTip":"Browse the tools","openFolder":"Open my documents","quickTools":"Quick actions","scan":"Smart Scan","importPhotos":"Import Images","importFiles":"Import Files","back":"Back","typePdf":"PDF","select":"Select","more":"More actions","size":"Size","edited":"Latest"},"ar":{"search":"قلب على الوثائق","id":"البطاقة الوطنية","sign":"توقيع PDF","all":"الكل","pdf":"أدوات PDF","extract":"استخراج النص","share":"مشاركة","savePdf":"حفظ PDF","view":"معاينة","open":"فتح","recentSubtitle":"آخر الوثائق ديالك جاهزة للفتح والمشاركة","hold":"ضغط مطوّل على الوثيقة باش تحدد عدة ملفات","results":"نتائج البحث","noResults":"ما لقينا حتى وثيقة بهاد الاسم","toolsTip":"شوف جميع الأدوات","openFolder":"فتح وثائقي","quickTools":"أدوات سريعة","scan":"سكانير ذكي","importPhotos":"استيراد الصور","importFiles":"استيراد الملفات","back":"رجوع","typePdf":"PDF","select":"تحديد","more":"المزيد","size":"الحجم","edited":"الأخير"},"fr":{"search":"Rechercher des documents","id":"Cartes d’identité","sign":"Signer PDF","all":"Tout","pdf":"Outils PDF","extract":"Extraire texte","share":"Partager","savePdf":"Enregistrer PDF","view":"Voir","open":"Ouvrir","recentSubtitle":"Vos documents récents à portée de main","hold":"Appui long pour sélectionner plusieurs documents","results":"Résultats","noResults":"Aucun document trouvé","toolsTip":"Voir tous les outils","openFolder":"Mes documents","quickTools":"Accès rapide","scan":"Scan intelligent","importPhotos":"Importer images","importFiles":"Importer fichiers","back":"Retour","typePdf":"PDF","select":"Sélectionner","more":"Plus d’actions","size":"Taille","edited":"Récent"},"es":{"search":"Buscar documentos","id":"Tarjetas de identidad","sign":"Firmar PDF","all":"Todo","pdf":"Herramientas PDF","extract":"Extraer texto","share":"Compartir","savePdf":"Guardar PDF","view":"Ver","open":"Abrir","recentSubtitle":"Tus documentos recientes, a mano","hold":"Mantén pulsado para seleccionar varios archivos","results":"Resultados","noResults":"No se encontraron archivos","toolsTip":"Todas las herramientas","openFolder":"Mis documentos","quickTools":"Accesos rápidos","scan":"Escaneo inteligente","importPhotos":"Importar imágenes","importFiles":"Importar archivos","back":"Volver","typePdf":"PDF","select":"Seleccionar","more":"Más acciones","size":"Tamaño","edited":"Reciente"},"de":{"search":"Dokumente suchen","id":"Ausweise","sign":"PDF signieren","all":"Alle","pdf":"PDF-Werkzeuge","extract":"Text erkennen","share":"Teilen","savePdf":"PDF speichern","view":"Ansehen","open":"Öffnen","recentSubtitle":"Letzte Dokumente direkt verfügbar","hold":"Lange drücken, um mehrere Dateien auszuwählen","results":"Ergebnisse","noResults":"Keine passenden Dokumente","toolsTip":"Alle Werkzeuge","openFolder":"Meine Dokumente","quickTools":"Schnellaktionen","scan":"Smart-Scan","importPhotos":"Bilder importieren","importFiles":"Dateien importieren","back":"Zurück","typePdf":"PDF","select":"Auswählen","more":"Mehr Aktionen","size":"Größe","edited":"Neu"},"pt":{"search":"Pesquisar documentos","id":"Cartões de identidade","sign":"Assinar PDF","all":"Todos","pdf":"Ferramentas PDF","extract":"Extrair texto","share":"Partilhar","savePdf":"Guardar PDF","view":"Ver","open":"Abrir","recentSubtitle":"Documentos recentes sempre disponíveis","hold":"Toque longo para selecionar vários ficheiros","results":"Resultados","noResults":"Nenhum documento encontrado","toolsTip":"Todas as ferramentas","openFolder":"Os meus documentos","quickTools":"Acesso rápido","scan":"Scanner inteligente","importPhotos":"Importar imagens","importFiles":"Importar ficheiros","back":"Voltar","typePdf":"PDF","select":"Selecionar","more":"Mais ações","size":"Tamanho","edited":"Recente"},"it":{"search":"Cerca documenti","id":"Carte d’identità","sign":"Firma PDF","all":"Tutti","pdf":"Strumenti PDF","extract":"Estrai testo","share":"Condividi","savePdf":"Salva PDF","view":"Apri","open":"Apri","recentSubtitle":"I tuoi documenti recenti a portata di mano","hold":"Tieni premuto per selezionare più file","results":"Risultati","noResults":"Nessun documento trovato","toolsTip":"Tutti gli strumenti","openFolder":"I miei documenti","quickTools":"Azioni rapide","scan":"Scansione intelligente","importPhotos":"Importa immagini","importFiles":"Importa file","back":"Indietro","typePdf":"PDF","select":"Seleziona","more":"Altre azioni","size":"Dimensione","edited":"Recente"}};
const hv=key=>(homeVisualText[language]||homeVisualText.en)[key]||key;
let homeSearchQuery='';
let homeExpandedUri=null;
const app = document.getElementById('app');
const tr = (key) => translations[language]?.[key] || translations.en[key] || key;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fname = (name) => String(name).replace(/\.[^.]+$/,'').replace(/[^\w\- .]/g,'_').slice(0,60) || 'document';
const formatSize = (n)=>n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
const libraryLabels={
 en:{documents:'My Documents',saved:'Saved on your phone',open:'Open',share:'Share',remove:'Delete',empty:'Your saved scans and PDFs will appear here.',search:'Search documents',confirm:'Delete this file from Documents/RivoScan? This cannot be undone.',folder:'Documents / RivoScan',saving:'Saving PDF to your phone…',savedNow:'Saved to Documents/RivoScan',scan:'Scan a document',files:'Files',all:'All tools'},
 fr:{documents:'Mes documents',saved:'Enregistrés sur le téléphone',open:'Ouvrir',share:'Partager',remove:'Supprimer',empty:'Vos scans et PDF sauvegardés apparaîtront ici.',search:'Rechercher',confirm:'Supprimer ce fichier de Documents/RivoScan ?',folder:'Documents / RivoScan',saving:'Enregistrement du PDF…',savedNow:'Enregistré dans Documents/RivoScan',scan:'Scanner un document',files:'Fichiers',all:'Tous les outils'},
 ar:{documents:'وثائقي',saved:'محفوظة في ذاكرة الهاتف',open:'فتح',share:'مشاركة',remove:'حذف',empty:'الوثائق وملفات PDF اللي حفظتي غادي تلقاها هنا.',search:'قلب على وثيقة',confirm:'واش تحذف هاد الملف نهائياً من Documents/RivoScan؟',folder:'الوثائق / RivoScan',saving:'جاري حفظ PDF في الهاتف…',savedNow:'تحفظ الملف في Documents/RivoScan',scan:'سكانير جديد',files:'ملفات',all:'جميع الأدوات'},
 es:{documents:'Mis documentos',saved:'Guardados en el teléfono',open:'Abrir',share:'Compartir',remove:'Eliminar',empty:'Tus escaneos y PDF aparecerán aquí.',search:'Buscar documentos',confirm:'¿Eliminar este archivo de Documents/RivoScan?',folder:'Documents / RivoScan',saving:'Guardando PDF…',savedNow:'Guardado en Documents/RivoScan',scan:'Escanear documento',files:'Archivos',all:'Todas las herramientas'},
 de:{documents:'Meine Dokumente',saved:'Auf dem Smartphone gespeichert',open:'Öffnen',share:'Teilen',remove:'Löschen',empty:'Gespeicherte Scans und PDFs erscheinen hier.',search:'Dokumente suchen',confirm:'Datei aus Documents/RivoScan löschen?',folder:'Documents / RivoScan',saving:'PDF wird gespeichert…',savedNow:'Gespeichert in Documents/RivoScan',scan:'Dokument scannen',files:'Dateien',all:'Alle Werkzeuge'},
 pt:{documents:'Meus documentos',saved:'Guardados no telefone',open:'Abrir',share:'Compartilhar',remove:'Excluir',empty:'Digitalizações e PDFs guardados aparecem aqui.',search:'Procurar documentos',confirm:'Excluir de Documents/RivoScan?',folder:'Documents / RivoScan',saving:'A guardar PDF…',savedNow:'Guardado em Documents/RivoScan',scan:'Digitalizar',files:'Ficheiros',all:'Todas as ferramentas'},
 it:{documents:'I miei documenti',saved:'Salvati sul telefono',open:'Apri',share:'Condividi',remove:'Elimina',empty:'Le scansioni e i PDF salvati appariranno qui.',search:'Cerca documenti',confirm:'Eliminare questo file da Documents/RivoScan?',folder:'Documents / RivoScan',saving:'Salvataggio PDF…',savedNow:'Salvato in Documents/RivoScan',scan:'Scansiona documento',files:'File',all:'Tutti gli strumenti'}
};
const dl=(key)=>libraryLabels[language]?.[key]||libraryLabels.en[key]||key;
const scanLabels={
 en:{title:'Scan document',live:'Camera · Live edges · Auto crop',import:'Import a photo',corners:'Detect and adjust 4 corners',pages:'Your pages',auto:'Scans are saved automatically after capture',add:'Add photos',basic:'Basic camera',save:'Save pages as PDF',hint:'Saved documents stay on your phone.',crop:'Auto-crop with ML Kit',ready:'Live borders ready',fallback:'If live camera fails, use ML Kit',refresh:'Refresh'},
 fr:{title:'Scanner un document',live:'Caméra · Bords en direct · Recadrage',import:'Importer une photo',corners:'Détecter et ajuster les 4 coins',pages:'Vos pages',auto:'Les scans sont enregistrés automatiquement',add:'Ajouter des photos',basic:'Caméra simple',save:'Enregistrer en PDF',hint:'Les documents restent sur le téléphone.',crop:'Recadrage intelligent ML Kit',ready:'Détection des bords active',fallback:'Si la caméra échoue, utilisez ML Kit',refresh:'Actualiser'},
 ar:{title:'سكانير الوثائق',live:'كاميرا · تحديد الحواف · قص تلقائي',import:'استيراد صورة',corners:'تحديد وتعديل الزوايا الأربعة',pages:'الصفحات المصورة',auto:'الوثائق كتتحفظ تلقائياً من بعد السكان',add:'زيادة صور',basic:'الكاميرا العادية',save:'حفظ الصفحات PDF',hint:'وثائقك محفوظة فالهاتف وتقدر ترجع ليها أي وقت.',crop:'قص تلقائي ذكي ML Kit',ready:'تحديد الحواف المباشر خدام',fallback:'إلا ما خدمتش الكاميرا جرب القص الذكي ML Kit',refresh:'تحديث'},
 es:{title:'Escanear documento',live:'Cámara · Bordes · Recorte automático',import:'Importar foto',corners:'Detectar y ajustar 4 esquinas',pages:'Tus páginas',auto:'Los escaneos se guardan automáticamente',add:'Añadir fotos',basic:'Cámara básica',save:'Guardar PDF',hint:'Tus archivos se quedan en el teléfono.',crop:'Recorte ML Kit',ready:'Bordes detectados',fallback:'Si falla la cámara, usa ML Kit',refresh:'Actualizar'},
 de:{title:'Dokument scannen',live:'Kamera · Kanten · Automatisch zuschneiden',import:'Foto importieren',corners:'Vier Ecken erkennen und anpassen',pages:'Deine Seiten',auto:'Scans werden automatisch gespeichert',add:'Fotos hinzufügen',basic:'Einfache Kamera',save:'Seiten als PDF speichern',hint:'Dateien bleiben auf dem Smartphone.',crop:'ML Kit Auto-Zuschnitt',ready:'Live-Kanten bereit',fallback:'Falls Kamera nicht startet, ML Kit verwenden',refresh:'Aktualisieren'},
 pt:{title:'Digitalizar documento',live:'Câmara · Bordas · Recorte automático',import:'Importar foto',corners:'Detetar e ajustar 4 cantos',pages:'As suas páginas',auto:'As digitalizações são guardadas automaticamente',add:'Adicionar fotos',basic:'Câmara simples',save:'Guardar PDF',hint:'Os documentos ficam guardados no telemóvel.',crop:'Recorte ML Kit',ready:'Deteção ativa',fallback:'Se a câmara falhar, use ML Kit',refresh:'Atualizar'},
 it:{title:'Scansiona documento',live:'Fotocamera · Bordi · Ritaglio automatico',import:'Importa foto',corners:'Rileva e regola i 4 angoli',pages:'Le tue pagine',auto:'Le scansioni vengono salvate automaticamente',add:'Aggiungi foto',basic:'Fotocamera base',save:'Salva PDF',hint:'I documenti rimangono salvati sul telefono.',crop:'Ritaglio ML Kit',ready:'Bordi in tempo reale attivi',fallback:'Se la fotocamera non funziona, usa ML Kit',refresh:'Aggiorna'}
};
const sl=(key)=>scanLabels[language]?.[key]||scanLabels.en[key]||key;

const groupTitle = {create:'create',organize:'organize',edit:'edit',convert:'convert'};
function render(){
  if(closeTransfer){closeTransfer();closeTransfer=null;}
  previewURLs.forEach(u=>URL.revokeObjectURL(u));previewURLs=[];
  document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';document.body.dir=document.documentElement.dir;
  const aside = `<aside class="sidebar"><div class="brand"><img src="/icon.svg?v=20261101" alt="RivoScan scanner icon"><div><strong>RivoScan</strong><small>BY RIBHLAB</small></div></div><div class="nav-label">WORKSPACE</div><button class="nav-button ${!activeTool?'active':''}" data-go="home">${ico('home')} ${tr('home')}</button><button class="nav-button ${activeTool?.id==='library'?'active':''}" data-open-library>${ico('file')} ${dl('documents')}</button><div class="nav-label">PDF TOOLS</div>${Object.keys(groupTitle).map(g=>`<button class="nav-button" data-category="${g}">${ico(g==='create'?'scan':g==='organize'?'merge':g==='edit'?'sign':'convert')} ${tr(g)}</button>`).join('')}<button class="nav-button ${activeTool?.id==='tools'?'active':''}" data-tab="tools">${ico('convert')} ${ut('tools')}</button><button class="nav-button ${activeTool?.id==='me'?'active':''}" data-tab="me">${ico('info')} ${ut('me')}</button><div class="sidebar-bottom"><div class="secure-mark">${ico('shield')} ${tr('secure')}</div><p>${tr('privacy')}</p></div></aside>`;
  const isHome=!activeTool, isDocs=activeTool?.id==='library', isTools=activeTool?.id==='tools', isMe=activeTool?.id==='me';
  const header = `<header class="topbar"><span class="crumb"><img class="topbar-brand-icon" src="/icon.svg?v=20261101" alt=""><strong>RivoScan</strong><small class="rivo-build-version" aria-label="App version v${appVersion}">v${appVersion}</small></span><div class="topright"><button class="rivo-header-action" data-open-library title="${hv('openFolder')}" aria-label="${hv('openFolder')}">${ico('folder',22)}</button><button class="rivo-header-action rivo-header-feature" data-tab="tools" title="${hv('toolsTip')}" aria-label="${hv('toolsTip')}">${ico('sparkle',22)}</button></div></header>`;
  const mobile = `<nav class="mobilebar" aria-label="Main navigation"><button type="button" data-go="home" class="${isHome?'active':''}">${ico('home')}${ut('home')}</button><button type="button" data-open-library class="${isDocs?'active':''}">${ico('file')}${ut('documents')}</button><button type="button" data-tab="tools" class="${isTools?'active':''}">${ico('grid')}${ut('tools')}</button><button type="button" data-tab="me" class="${isMe?'active':''}">${ico('user')}${ut('me')}</button></nav>`;
  const showFab=(isHome||isDocs||isTools);
  app.innerHTML=`<div class="shell rivo-dark-ui"><div class="desktop-wrap">${aside}</div><main class="main">${header}<div class="content">${isDocs?libraryWorkspace():isTools?toolsWorkspace():isMe?settingsWorkspace():activeTool?workspace():home()}</div></main>${showFab?`<button type="button" class="floating-scan" data-live-camera aria-label="${ut('scan')}">${ico('camera',29)}</button>`:''}${mobile}</div>`;
  localizeStaticUI(app,language);
  wire();
}
function visualFileType(doc){
 const mime=(doc.mimeType||'').toLowerCase(),name=(doc.name||'').toLowerCase();
 if(/pdf/.test(mime)||name.endsWith('.pdf'))return {code:'PDF',klass:'pdf'};
 if(/^image\//.test(mime)||/\.(jpe?g|png|webp|heic|gif)$/.test(name))return {code:'IMG',klass:'image'};
 if(/\.(xlsx?|csv|ods)$/.test(name))return {code:'XLS',klass:'xls'};
 if(/\.(docx?|odt|rtf)$/.test(name))return {code:'DOC',klass:'doc'};
 if(/\.(zip|rar|7z)$/.test(name))return {code:'ZIP',klass:'zip'};
 if(/\.(txt|md)$/.test(name))return {code:'TXT',klass:'txt'};
 return {code:'FILE',klass:'generic'};
}
function recentDocuments(limit=6,query=homeSearchQuery){
 const needle=String(query||'').trim().toLocaleLowerCase();
 const matched=libraryItems.map((doc,index)=>({doc,index}))
  .filter(({doc})=>!needle||doc.name.toLocaleLowerCase().includes(needle)).slice(0,needle?30:limit);
 if(!matched.length)return `<div class="recent-empty">${ico('search',27)}<span>${needle?hv('noResults'):ut('noRecent')}</span><button type="button" data-open-library>${hv('openFolder')}</button></div>`;
 return matched.map(({doc,index},visibleIndex)=>{
  const file=visualFileType(doc);
  const expanded=homeExpandedUri?homeExpandedUri===doc.uri:visibleIndex===0;
  const canPdf=file.klass==='pdf'||file.klass==='image';
  return `<article class="recent-entry rivo-recent-card ${expanded?'rivo-recent-expanded':''} ${bulkUI.chosen(doc)?'doc-selected':''}" data-doc-open="${index}" role="button" tabindex="0" aria-label="${hv('view')} ${escapeHTML(doc.name)}" aria-selected="${bulkUI.chosen(doc)}">
     <span class="recent-file-icon rivo-file-thumb rivo-file-${file.klass}" aria-hidden="true"><span>${file.code}</span></span>
     <div class="recent-file-meta"><strong title="${escapeHTML(doc.name)}">${escapeHTML(doc.name)}</strong>
       <small>${ico('clock',13)} ${doc.created?new Date(doc.created).toLocaleString(language,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'RivoScan'} <span class="rivo-metadata-dot">·</span> ${formatSize(doc.size||0)}</small></div>
     <input type="checkbox" class="doc-select-box rivo-recent-check" data-doc-select="${index}" aria-label="${hv('select')} ${escapeHTML(doc.name)}" ${bulkUI.chosen(doc)?'checked':''}>
     ${expanded?`<div class="rivo-recent-actions">
       <button type="button" data-doc-share="${index}" class="rivo-recent-share">${ico('upload',18)} ${hv('share')}</button>
       ${canPdf?`<button type="button" data-doc-savepdf="${index}" class="rivo-recent-pdf">${ico('file',18)} ${hv('savePdf')}</button>`:`<button type="button" data-doc-open="${index}" class="rivo-recent-pdf">${ico('folder',18)} ${hv('open')}</button>`}
       <button type="button" data-doc-open="${index}" class="rivo-recent-view">${ico('eye',19)} ${hv('view')}</button>
     </div>`:''}
     <button type="button" data-expand-doc="${index}" class="rivo-expand-card" aria-label="${hv('more')}" aria-expanded="${expanded}">${ico('more',17)}</button>
   </article>`;
 }).join('');
}
function home(){
 const shortcuts=[
  {id:'scan',icon:'scan',text:hv('scan'),action:'data-live-camera'},
  {id:'pdf',icon:'file',text:hv('pdf'),action:'data-tab="tools"'},
  {id:'import-image',icon:'image',text:hv('importPhotos'),action:'data-import="image"'},
  {id:'import-file',icon:'folder',text:hv('importFiles'),action:'data-import="file"'},
  {id:'id',icon:'idcard',text:hv('id'),action:'data-id-card-scan'},
  {id:'ocr',icon:'ocr',text:hv('extract'),action:'data-tool="ocr"'},
  {id:'sign',icon:'sign',text:hv('sign'),action:'data-tool="sign"'},
  {id:'all',icon:'grid',text:hv('all'),action:'data-tab="tools"'}
 ];
 return `<section class="app-home rivo-home">
   <div class="rivo-search-row">
     <label class="rivo-home-search">${ico('search',23)} <input type="search" id="home-quick-search" placeholder="${hv('search')}" aria-label="${hv('search')}" value="${escapeHTML(homeSearchQuery)}" autocomplete="off"><span class="rivo-search-key" aria-hidden="true">${ico('search',14)}</span></label>
   </div>
   <div class="home-shortcuts rivo-shortcuts">${shortcuts.map(short=>`<button type="button" class="home-shortcut rivo-tile rivo-tile-${short.id}" ${short.action}>
       <span class="home-shortcut-icon">${ico(short.icon,27)}</span><span>${escapeHTML(short.text)}</span>
     </button>`).join('')}</div>
   <div class="home-section-heading rivo-section-title"><div><h2 id="home-results-title">${homeSearchQuery?hv('results'):ut('recent')}</h2><small>${hv('recentSubtitle')}</small></div><button type="button" data-open-library>${ut('seeAll')} ${ico('back',18)}</button></div>
   <div class="rivo-longpress-hint">${ico('info',19)} <span>${hv('hold')}</span></div>
   <div class="rivo-home-bulk" id="home-selection-root">${bulkUI.toolbar()}</div>
   <div class="recent-panel" id="home-recents">${recentDocuments()}</div>
   <p class="home-footer-note">${ico('lock',15)} ${ut('privacy')}</p>
  </section>`;
}
function toolsWorkspace(){
 const copy=({en:'Search tools',ar:'قلب على الأدوات',fr:'Rechercher un outil',es:'Buscar herramienta',de:'Werkzeug suchen',pt:'Pesquisar ferramentas',it:'Cerca strumenti'})[language]||'Search tools';
 return `<section class="app-tools rivo-tools-hub"><div class="rivo-tools-heading"><h1>${ut('tools')}</h1><button data-tools-focus aria-label="${copy}">${ico('search',22)}</button></div>
 <div class="rivo-tools-search">${ico('search',19)}<input id="tools-query" type="search" aria-label="${copy}" placeholder="${copy}" autocomplete="off"></div>
 <nav class="rivo-tool-pills">${toolGroups.map((g,i)=>`<button type="button" data-hub-section="${g.id}" class="${i===0?'active':''}">${hubGroupLabel(language,g.id)}</button>`).join('')}</nav>
 ${toolGroups.map(g=>`<section class="tools-section rivo-tools-section" id="section-${g.id}"><h2>${hubGroupLabel(language,g.id)}</h2><div class="mobile-tools-grid rivo-hub-grid">
   ${g.entries.map(id=>{const item=tools.find(x=>x.id===id),spec=hubSpecial[id];const icon=spec?.icon||item?.icon||'file';const color=spec?.color||item?.color||'blue';
    const label=hubLabel(language,id,item?tn(item):id);
    return `<button class="mobile-tool-tile rivo-hub-tile" data-hub-action="${id}" data-hub-label="${escapeHTML(label.toLocaleLowerCase())}"><span class="tool-icon ${color}">${ico(icon,26)}</span><strong>${escapeHTML(label)}</strong></button>`}).join('')}
 </div></section>`).join('')}
 <p class="rivo-tools-no-results" id="tools-no-results" hidden>0</p></section>`;
}
function scannerPreferenceRows(){
 const prefs=readScanPrefs(localStorage),labels=scanPrefsText(language);
 const secondary={autoClean:labels.autoCleanHelp,keepOriginal:labels.keepOriginalHelp,autoSavePdf:labels.autoSavePdfHelp};
 return SCAN_PREF_FIELDS.map(field=>{
  const key=field.key,iconName=key==='cameraQuality'?'camera':key==='pageSize'?'file':key==='keepOriginal'?'shield':'check';
  const options=field.options?.map(value=>'<option value="'+value+'"'+(prefs[key]===value?' selected':'')+'>'+escapeHTML(formatScanSettingValue(language,key,value))+'</option>').join('');
  const control=field.type==='switch'
    ?'<input type="checkbox" data-scan-pref="'+key+'" role="switch" aria-label="'+escapeHTML(labels[key])+'" '+(prefs[key]?'checked':'')+'>'
    :'<select data-scan-pref="'+key+'" aria-label="'+escapeHTML(labels[key])+'">'+options+'</select>';
  return '<label class="settings-row rivo-scanner-pref"><span class="settings-row-icon">'+ico(iconName,21)+'</span>'+
    '<span class="rivo-pref-copy"><strong>'+escapeHTML(labels[key])+'</strong>'+
    (secondary[key]?'<small>'+escapeHTML(secondary[key])+'</small>':'')+'</span>'+control+'</label>';
 }).join('');
}
function settingsWorkspace(){
 return `<section class="app-settings"><div class="page-heading"><h1>${ut('me')}</h1><p>RivoScan · v${appVersion}</p></div>
 <div class="settings-identity"><div class="settings-logo"><img src="/icon.svg" alt=""></div><div><h2>RivoScan</h2><small>${ut('noAccount')} · ${ut('privacy')}</small></div></div>
 <div class="settings-section"><h2>${ut('storage')}</h2><button data-open-library class="settings-row"><span class="settings-row-icon">${ico('file',22)}</span><span><strong>${ut('myFiles')}</strong><small>${ut('device')}</small></span>${ico('back',18)}</button>
 <button data-tool="scan" class="settings-row"><span class="settings-row-icon">${ico('camera',22)}</span><span><strong>${ut('scan')}</strong><small>${sl('live')}</small></span>${ico('back',18)}</button></div>
 <div class="settings-section rivo-scan-settings"><h2>${scanPrefsText(language).title}</h2><p class="rivo-pref-section-subtitle">${scanPrefsText(language).sub}</p>${scannerPreferenceRows()}<p class="rivo-pref-storage">${scanPrefsText(language).folder}</p></div>
 <div class="settings-section"><h2>${ut('general')}</h2><label class="settings-row settings-lang"><span class="settings-row-icon">${ico('info',22)}</span><span><strong>${ut('language')}</strong></span><select id="language" aria-label="${ut('language')}">${[['en','English'],['fr','Français'],['ar','العربية'],['es','Español'],['de','Deutsch'],['pt','Português'],['it','Italiano']].map(([id,l])=>`<option value="${id}" ${language===id?'selected':''}>${l}</option>`).join('')}</select></label>
 <label class="settings-row settings-sounds"><span class="settings-row-icon">${ico('check',22)}</span><span><strong>${soundWord(0)}</strong><small>${soundWord(1)}</small></span><input type="checkbox" id="sound-toggle" role="switch" aria-label="${soundWord(0)}" ${soundsEnabled?'checked':''}></label>
 <button type="button" class="settings-row" data-whats-new><span class="settings-row-icon">${ico('sparkle',22)}</span><span><strong>${({ar:'شنو الجديد؟',fr:'Nouveautés',es:'Novedades',de:'Was ist neu?',pt:'Novidades',it:'Novità',en:"What's New"})[language]||"What's New"}</strong><small>RivoScan v${appVersion}</small></span></button>
 <div class="settings-row settings-about"><span class="settings-row-icon">${ico('shield',22)}</span><span><strong>${ut('about')}</strong><small>${ut('privacy')} · ${ut('noAccount')}</small></span></div></div>
 </section>`;
}
function card(t){return `<button class="tool-card ${t.id==='scan'?'tool-card-featured':''}" data-tool="${t.id}"><span class="tool-card-header"><span class="tool-icon ${t.color}">${ico(t.icon,24)}</span><span class="tool-card-arrow">${ico('back',16)}</span></span><span class="tool-card-title">${escapeHTML(tn(t))}</span><small>${escapeHTML(td(t))}</small>${t.id==='scan'?'<span class="tool-feature-label">LIVE EDGE SCAN</span>':''}</button>`;}
const opts = {
  split: `<div class="field"><label>Pages to keep (e.g. 1-3, 5, 8)</label><input name="pages" placeholder="1-3, 5, 8" value="1-3"></div><p class="hint">Select only the pages you want in the new PDF.</p>`,
  delete:`<div class="field"><label>Pages to remove</label><input name="pages" placeholder="2, 4-6" value="2"></div>`,
  rotate:`<div class="field"><label>Pages to rotate (empty = all)</label><input name="pages" placeholder="1, 3-5"></div><div class="field"><label>Rotation</label><select name="angle"><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></div>`,
  reorder:`<div class="field"><label>New page order (one-based)</label><input name="pages" placeholder="3, 1, 2, 4" value="2, 1"></div><p class="hint">List ALL pages exactly once. Example for a 3-page PDF: 3, 1, 2.</p>`,
  numbers:`<div class="field"><label>Starting page number</label><input name="start" type="number" min="1" value="1"></div><div class="field"><label>Position</label><select name="position"><option value="bottom">Bottom center</option><option value="top">Top right</option></select></div>`,
  watermark:`<div class="field"><label>Watermark text</label><input name="watermark" value="CONFIDENTIAL" maxlength="80"></div><div class="field"><label>Opacity</label><input type="range" name="opacity" min="10" max="70" value="23"></div>`,
  text:`<div class="field"><label>Text to add on each page</label><textarea name="note" rows="3" placeholder="Your annotation"></textarea></div><div class="field"><label>Position</label><select name="position"><option value="top">Top</option><option value="bottom">Bottom</option><option value="center">Center</option></select></div>`,
  sign:`<div class="field"><label>Draw signature (finger / mouse)</label><canvas id="signpad" class="signpad" aria-label="Signature drawing pad"></canvas><button class="btn btn-outline" style="margin-top:8px" id="clear-sign">Clear signature</button></div><div class="field"><label>Page number</label><input name="page" type="number" min="1" value="1"></div><div class="field"><label>Position</label><select name="position"><option value="bottom">Bottom right</option><option value="center">Center</option></select></div><p class="hint">This places a visual signature; it is not a cryptographic digital signature.</p>`,
  scan:`<p class="hint">LIVE CAMERA: Watch a green outline follow the paper. Capture, drag four corners to adjust them, then Save page. GALLERY: Import an existing photo, adjust its corners and save. Multiple saved pages become one PDF.</p><div class="field"><label>Scan appearance</label><select name="filter"><option value="color">Original color</option><option value="enhance" selected>Enhanced document</option><option value="gray">Black & white (grayscale)</option><option value="bw">High contrast monochrome</option></select></div><div class="field"><label>Image quality</label><select name="quality"><option value=".95">Maximum</option><option value=".85">High</option><option value=".65">Balanced</option></select></div>`,
  images:`<div class="field"><label>Image quality</label><select name="quality"><option value=".95">High</option><option value=".75" selected>Balanced</option><option value=".5">Smaller file</option></select></div>`,
  pdftoimages:`<div class="field"><label>Image format</label><select name="format"><option value="jpeg">JPG</option><option value="png">PNG</option></select></div><div class="field"><label>Resolution</label><select name="scale"><option value="1">Standard</option><option value="1.5" selected>High</option><option value="2">Extra high</option></select></div>`,
  compress:`<div class="field"><label>Compression quality</label><select name="quality"><option value=".38">Smaller file</option><option value=".58" selected>Balanced</option><option value=".78">Higher quality</option></select></div><p class="hint">Best for scanned PDFs. Pages are converted to images, so existing selectable text, links and forms may be lost. Results are not guaranteed to be smaller.</p>`,
  ocr:`<div class="field"><label>OCR language</label><select name="ocrLang"><option value="eng" selected>English</option><option value="fra">Français</option><option value="ara">العربية</option><option value="spa">Español</option><option value="deu">Deutsch</option><option value="por">Português</option><option value="ita">Italiano</option></select></div><p class="hint">First OCR use may download trained language data. OCR depends on image quality and can take time.</p>`,
  metadata:`<p class="hint">Clears commonly used metadata fields. Not a guarantee of forensic sanitization; embedded content, comments or hidden data may remain.</p>`
};

function scannerOptionsMarkup(){
 const prefs=readScanPrefs(localStorage);
 const markup=localizeOptionMarkup(opts.scan||'');
 const chosen='value="'+prefs.pdfQuality.toFixed(2).slice(1)+'"';
 return markup.replace(chosen,chosen+' selected');
}
function scannerWorkspace(){
  const live=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('RivoLiveScanner');
  return `<section class="workspace scan-workspace">
  <button class="back" data-go="home">${ico('back')} ${dl('all')}</button>
  <div class="work-title"><div class="tool-icon sky">${ico('scan',27)}</div><div><h1>${tn(tools.find(t=>t.id==='scan'))}</h1><p>${td(tools.find(t=>t.id==='scan'))}</p></div></div>
  <div class="scan-quick-actions"><button class="scan-action-primary" id="smart-scanner">${ico('camera',25)} <span><b>${sl('title')}</b><small>${sl('live')}</small></span><span class="scan-action-arrow">→</span></button>
  <button class="scan-action-secondary" id="scanner-gallery">${ico('image',24)} <span><b>${sl('import')}</b><small>${sl('corners')}</small></span></button></div>
  <div class="scan-quick-toolbar"><button data-open-library class="scan-documents-link">${ico('file',20)} ${dl('documents')}</button>
  <button id="mlkit-scanner" class="scan-mlkit-link">${ico('sparkle',18)} ${sl('crop')}</button></div>
  <div class="scan-runtime" role="status">${live?sl('ready'):sl('fallback')}</div>
  <div class="panel scan-session-panel"><div class="scan-panel-heading"><h3>${sl('pages')} <span class="scan-page-count">${files.length}</span></h3><small>${sl('auto')}</small></div>
  <div class="filelist" id="filelist">${renderFiles()}</div><div id="scanpreview"></div>
  <div class="scan-import-row"><label for="files" class="scan-upload-link">${ico('upload',18)} ${sl('add')}<input id="files" type="file" accept="image/*" multiple></label>
  <button id="camera" class="scan-upload-link">${ico('camera',18)} ${sl('basic')}</button></div>
  </div><div class="panel scan-export-panel"><div id="options">${scannerOptionsMarkup()}</div>
  <button id="process" class="btn operation scan-save-pdf">${ico('download',20)} ${sl('save')}</button>
  <p class="hint">${sl('hint')} ${dl('folder')}</p></div>
  </section>`;
}
function renderLibraryRows(needle=''){
  const q=String(needle||'').trim().toLocaleLowerCase();
  const matched=libraryItems.map((item,index)=>({item,index}))
    .filter(({item})=>(!q||item.name.toLocaleLowerCase().includes(q)) &&
      (libraryFilter==='all'||(libraryFilter==='pdf'?/pdf/i.test(item.mimeType||''):/^image\//.test(item.mimeType||''))))
    .sort((a,b)=>librarySort==='oldest'?(a.item.created||0)-(b.item.created||0)
       :librarySort==='name'?a.item.name.localeCompare(b.item.name)
       :librarySort==='size'?(b.item.size||0)-(a.item.size||0)
       :(b.item.created||0)-(a.item.created||0));
  if(libraryLoading)return `<div class="doc-empty">${lt('loading')}</div>`;
  if(libraryError)return `<div class="doc-empty doc-error">${escapeHTML(libraryError)}</div>`;
  if(!matched.length)return `<div class="doc-empty">${ico('file',32)}<p>${dl('empty')}</p><button class="btn" data-tool="scan">${ico('scan')} ${dl('scan')}</button></div>`;
  return matched.map(({item,index})=>`<article class="document-entry ${bulkUI.chosen(item)?'doc-selected':''}" data-doc-open="${index}" role="button" tabindex="0" aria-selected="${bulkUI.chosen(item)}" aria-label="${lt('preview')} ${escapeHTML(item.name)}">
    ${bulkUI.checkbox(item,index)}
    <div class="document-icon">${ico('file',25)}</div>
    <div class="document-description"><strong title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</strong><small>${formatSize(item.size||0)} · ${item.created?new Date(item.created).toLocaleDateString(language):'RivoScan'}</small></div>
    <div class="document-buttons">
      <button type="button" data-doc-share="${index}" aria-label="${dl('share')} ${escapeHTML(item.name)}">${ico('upload',19)}<span>${dl('share')}</span></button>
      ${(/\.pdf$/i.test(item.name)||/pdf/i.test(item.mimeType||''))?'<button type="button" data-doc-print="'+index+'" aria-label="'+escapeHTML(hubLabel(language,'printPdf','Print PDF'))+'">'+ico('file',18)+'<span>'+escapeHTML(hubLabel(language,'printPdf','Print PDF'))+'</span></button>':''}
      <button type="button" data-doc-delete="${index}" class="document-delete" aria-label="${dl('remove')} ${escapeHTML(item.name)}">${ico('delete',19)}</button>
    </div></article>`).join('');
}
function libraryWorkspace(){
  return `<section class="workspace library-workspace"><button class="back" data-go="home">${ico('back')} ${dl('all')}</button>
    <div class="library-heading"><div><div class="work-title"><div class="tool-icon sky">${ico('file',26)}</div><div><h1>${dl('documents')}</h1><p>${dl('saved')} · ${dl('folder')}</p><small class="rivo-library-version">RivoScan v${appVersion} · Documents/RivoScan</small></div></div></div>
    <div class="library-heading-actions"><button class="btn btn-outline" data-import="image">${ico('image',18)} ${ut('import')}</button><button class="btn btn-outline" data-import="file">${ico('upload',18)} ${ut('myFiles')}</button></div></div>
    <div class="panel library-panel"><div class="library-top"><strong>${libraryItems.length} ${dl('files')}</strong><div class="storage-actions"><button id="open-storage-folder" type="button" class="scan-upload-link">${ico('file',17)} ${vivoFolderLabel()}</button><button id="refresh-documents" class="scan-upload-link">${ico('rotate',17)} ${lt('refresh')}</button></div></div>
    <label class="library-search">${ico('search',19)}<input id="library-search" type="search" placeholder="${dl('search')}"></label>
    <div class="library-controls"><label><span class="sr-only">${ut('allFiles')}</span><select id="library-filter"><option value="all" ${libraryFilter==='all'?'selected':''}>${ut('allFiles')}</option><option value="pdf" ${libraryFilter==='pdf'?'selected':''}>${ut('pdfFiles')}</option><option value="images" ${libraryFilter==='images'?'selected':''}>${ut('images')}</option></select></label>
    <label><span class="sr-only">${ut('sort')}</span><select id="library-sort"><option value="newest" ${librarySort==='newest'?'selected':''}>${ut('newest')}</option><option value="oldest" ${librarySort==='oldest'?'selected':''}>${ut('oldest')}</option><option value="name" ${librarySort==='name'?'selected':''}>${ut('name')}</option><option value="size" ${librarySort==='size'?'selected':''}>${ut('size')}</option></select></label>
    <button id="library-layout" type="button" aria-label="${libraryLayout==='list'?ut('grid'):ut('list')}">${ico(libraryLayout==='list'?'merge':'file',18)}</button></div>
    <div id="library-selection-root">${bulkUI.toolbar()}</div><p class="bulk-longpress-hint">${bulkUI.t('hint')}</p>
    <div id="library-list" class="library-list ${libraryLayout==='grid'?'documents-grid':''}">${renderLibraryRows()}</div></div></section>`;
}
async function loadLibrary(show=true){
  if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android'){
    libraryItems=[];libraryLoading=false;libraryError='Saved files are accessible in the installed Android app.';
    if(show&&activeTool?.id==='library')render();return;
  }
  if(!Capacitor.isPluginAvailable('RivoDocuments')){
    libraryItems=[];libraryLoading=false;libraryError='Documents storage component is missing. Update the Android app.';
    if(show&&activeTool?.id==='library')render();return;
  }
  libraryLoading=true;if(show&&activeTool?.id==='library')render();
  try{
    const result=await RivoDocuments.listFiles();
    libraryItems=(Array.isArray(result.files)?result.files:[]).sort((a,b)=>(b.created||0)-(a.created||0));
    bulkUI.prune();
    libraryError='';
  }catch(error){console.error('RivoDocuments library:',error);libraryError=error?.message||'Could not read documents';}
  finally{
    libraryLoading=false;
    if(show&&activeTool?.id==='library')render();
    else if(!activeTool){
      const homeRows=document.getElementById('home-recents');
      if(homeRows)homeRows.innerHTML=recentDocuments();
    }
  }
}
async function chooseLibraryFiles(kind='file'){
  if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('RivoDocuments')){
    toast('Import into My Documents requires the updated Android app.',true);return;
  }
  const input=document.createElement('input');
  input.type='file';
  input.accept=kind==='image'?'image/*':'*/*';
  input.multiple=true;
  input.style.position='fixed';input.style.opacity='0';input.style.pointerEvents='none';
  document.body.appendChild(input);
  input.onchange=async ()=>{
    const imported=[...input.files];input.remove();if(!imported.length)return;
    showBusy('Importing into RivoScan…');
    let success=0;
    try{
      for(const file of imported){
        if(file.size>60*1024*1024){toast('File over 60 MB: '+file.name,true);continue;}
        const bytes=new Uint8Array(await file.arrayBuffer());
        await RivoDocuments.saveFile({name:file.name,mimeType:file.type||'application/octet-stream',base64:toBase64(bytes)});
        success++;
      }
      await loadLibrary(false);
      toast(success+' file(s) saved to Documents/RivoScan.');
      if(success)openLibrary();
    }catch(error){console.error('Import to library:',error);toast(error?.message||'Import failed',true);}
    finally{clearBusy();}
  };
  input.click();
}
function openTab(tab){
  docViewerUI.close();
  if(tab==='library'){openLibrary();return;}
  bulkUI.clear();
  files=[];scanRotations=[];
  activeTool=tab==='tools'?{id:'tools',name:ut('tools')}:tab==='me'?{id:'me',name:ut('me')}:null;
  if(tab==='home')homeSearchQuery='';
  window.scrollTo({top:0,behavior:'instant'});render();
}
function refreshVisibleLibrary(){
  const list=document.getElementById('library-list');
  if(!list)return;
  list.innerHTML=renderLibraryRows(document.getElementById('library-search')?.value||'');
  const slot=document.getElementById('library-selection-root');if(slot)slot.innerHTML=bulkUI.toolbar();
  list.classList.toggle('documents-grid',libraryLayout==='grid');
  const toggle=document.getElementById('library-layout');
  if(toggle){toggle.setAttribute('aria-label',libraryLayout==='list'?ut('grid'):ut('list'));toggle.innerHTML=ico(libraryLayout==='list'?'merge':'file',18);}
}
function openLibrary(){
  docViewerUI.close();
  activeTool={id:'library',name:dl('documents')};files=[];scanRotations=[];bulkUI.clear();
  window.scrollTo({top:0,behavior:'instant'});render();loadLibrary();
}
async function handleLibraryAction(type,index){
  const selected=libraryItems[index];if(!selected)return;
  try{
    if(type==='delete'){
      if(!window.confirm(lt('confirmDelete')))return;
      await RivoDocuments.deleteFile({uri:selected.uri});await loadLibrary();
      toast(dl('remove')+' ✓');
    } else if(type==='open')await docViewerUI.open(selected);
    else if(type==='share')bulkUI.share([selected]);
  }catch(error){console.error(error);toast(error.message||'Could not open document',true)}
}


function workspace(){
  const t=activeTool;
  if(t.id==='peerTransfer')return peerWorkspace();
  if(t.id==='scan')return scannerWorkspace();
  return `<section class="workspace"><button class="back" data-go="home">${ico('back')} ${dl('all')}</button><div class="work-title"><div class="tool-icon ${t.color}">${ico(t.icon,24)}</div><div><h1>${escapeHTML(tn(t))}</h1><p>${escapeHTML(td(t))}</p></div></div><div class="work-grid"><div class="panel"><h3>${tr('select')}</h3><label class="dropzone"><div class="uploadicon">${ico('upload',26)}</div><strong>${tr('upload')}</strong><span>${tr('drop')}</span><span style="font-weight:700;color:#5661db">${escapeHTML(t.id==='bundle'?'PDF, JPG & PNG':t.id==='shareFiles'?'Any file format':t.accept.includes('image/')?'JPG, PNG & photos':'PDF documents')}</span><input id="files" aria-label="${lt('choose')}" type="file" accept="${t.accept}" ${t.multiple?'multiple':''}></label>${t.id==='scan'?`<div class="scan-runtime" role="status">${Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android'?(Capacitor.isPluginAvailable('RivoLiveScanner')?'Live edge camera ready':'Live edge camera not registered in installed app — use Smart Scan below until the Android APK is updated'):'Android native features require the installed RivoScan app'} <span>UI build 2026.10.31c</span></div><button class="btn" id="smart-scanner" style="width:100%;margin-top:12px">${ico('scan')} Open Live Camera · Detect Edges</button><button class="btn btn-light" id="mlkit-scanner" style="width:100%;margin-top:8px">${ico('scan')} Smart Scan · Auto-Crop (Google ML Kit)</button><button class="btn btn-light" id="scanner-gallery" style="width:100%;margin-top:8px">${ico('image')} Import Photo · Adjust 4 Corners</button><button class="btn btn-light" id="camera" style="width:100%;margin-top:8px">${ico('camera')} Basic camera (no auto-crop)</button>`:''}<div class="filelist" id="filelist">${renderFiles()}</div><div id="scanpreview"></div></div><div class="panel"><h3>${lt('options')}</h3><div id="options">${localizeOptionMarkup(opts[t.id]||`<p class="hint">${lt('local')}</p>`)}</div><button class="btn operation" id="process">${ico('download')} ${tr('run')}</button><div class="privacy">${ico('lock',17)} <span>${tr('privacy')}</span></div><p class="hint" style="margin-top:14px">${lt('fileHint')}</p></div></div></section>`;
}
function renderFiles(){return files.length?files.map((f,i)=>`<div class="file">${ico('file',17)}<b title="${escapeHTML(f.name)}">${escapeHTML(f.name)}</b><small>${formatSize(f.size)}</small>${activeTool?.multiple?`<button data-move="${i}" data-dir="-1" title="Move up">↑</button><button data-move="${i}" data-dir="1" title="Move down">↓</button>`:''}<button data-remove="${i}" aria-label="Remove file">×</button></div>`).join(''):'<div class="hint">No files selected yet</div>';}
function updateFileDisplay(){const box=document.getElementById('filelist');if(box)box.innerHTML=renderFiles();drawPreview();}
async function drawPreview(){
  previewURLs.forEach(u=>URL.revokeObjectURL(u));previewURLs=[];
  const box=document.getElementById('scanpreview');if(!box)return;
  if(!['scan','images'].includes(activeTool?.id)||!files.length){box.innerHTML='';return;}
  box.innerHTML=`<div class="preview">${files.slice(0,20).map((f,i)=>{const url=URL.createObjectURL(f);previewURLs.push(url);return `<div class="preview-item"><img src="${url}" alt="Page ${i+1}" style="transform:rotate(${scanRotations[i]||0}deg)"><div class="mini-actions"><button data-turn="${i}" title="Rotate">↻</button><span>${i+1}</span></div></div>`;}).join('')}</div>`;
}
function wire(){
  document.querySelectorAll('[data-open-library]').forEach(el=>el.addEventListener('click',()=>{
    openLibrary();
    if(el.hasAttribute('data-focus-search'))document.getElementById('library-search')?.focus();
  }));
  document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>openTab(el.dataset.tab)));
  document.querySelectorAll('[data-live-camera]').forEach(el=>el.addEventListener('click',async ()=>{
    if(Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android') await openLiveScanner();
    else openTool('scan');
  }));
  document.querySelectorAll('[data-import]').forEach(el=>el.addEventListener('click',()=>chooseLibraryFiles(el.dataset.import)));
  document.getElementById('refresh-documents')?.addEventListener('click',()=>loadLibrary());
  document.getElementById('open-storage-folder')?.addEventListener('click',async()=>{
    if(!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable('RivoDocuments')){toast(dl('folder'),true);return;}
    try{await RivoDocuments.openFolder();}
    catch(error){toast((error?.message||'Unable to open file manager')+' · '+dl('folder'),true);}
  });
  document.getElementById('library-search')?.addEventListener('input',refreshVisibleLibrary);
  document.getElementById('library-filter')?.addEventListener('change',e=>{libraryFilter=e.target.value;refreshVisibleLibrary()});
  document.getElementById('library-sort')?.addEventListener('change',e=>{librarySort=e.target.value;refreshVisibleLibrary()});
  document.getElementById('library-layout')?.addEventListener('click',()=>{libraryLayout=libraryLayout==='list'?'grid':'list';refreshVisibleLibrary()});
  bulkUI.wireToolbar(document.getElementById('library-selection-root'));
  bulkUI.wireToolbar(document.getElementById('home-selection-root'));
  document.getElementById('home-quick-search')?.addEventListener('input',event=>{
    homeSearchQuery=event.target.value;
    const rows=document.getElementById('home-recents');
    if(rows)rows.innerHTML=recentDocuments();
    const heading=document.getElementById('home-results-title');
    if(heading)heading.textContent=homeSearchQuery.trim()?hv('results'):ut('recent');
    bulkUI.sync();
  });
  document.querySelectorAll('[data-id-card-scan]').forEach(button=>button.addEventListener('click',()=>{
    if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android')openLiveScanner({mode:'ID Card'});
    else openTool('scan');
  }));
  for(const list of ['library-list','home-recents']){
    const el=document.getElementById(list);
    const activate=e=>{
      if(e.type==='click'&&bulkUI.suppressClick()){e.preventDefault();return;}
      const target=e.target.closest('[data-doc-select],[data-doc-savepdf],[data-expand-doc],[data-doc-open],[data-doc-share],[data-doc-delete],[data-doc-print]');
      if(!target || !el?.contains(target))return;
      if(e.type==='keydown' && !['Enter',' '].includes(e.key))return;
      if(e.type==='keydown')e.preventDefault();
      if(target.hasAttribute('data-doc-select')){
        if(e.type==='click')bulkUI.toggle(libraryItems[Number(target.dataset.docSelect)]);
        return;
      }
      if(target.hasAttribute('data-expand-doc')){
        const doc=libraryItems[Number(target.dataset.expandDoc)];
        if(doc){
          homeExpandedUri=homeExpandedUri===doc.uri?'none':doc.uri;
          const list=document.getElementById('home-recents');
          if(list)list.innerHTML=recentDocuments();
          bulkUI.sync();
        }
        return;
      }
      if(target.hasAttribute('data-doc-savepdf')){
        const doc=libraryItems[Number(target.dataset.docSavepdf)];
        if(doc)bulkUI.savePdf([doc]);
        return;
      }
      if(target.hasAttribute('data-doc-print')){
        const doc=libraryItems[Number(target.dataset.docPrint)];
        if(doc&&Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('RivoDocuments')){
          RivoDocuments.printFile({uri:doc.uri}).catch(error=>toast(error?.message||'Android printing is unavailable.',true));
        }else toast('Printing requires the Android app.',true);
        return;
      }
      const type=target.hasAttribute('data-doc-share')?'share':target.hasAttribute('data-doc-delete')?'delete':'open';
      const index=Number(target.getAttribute('data-doc-'+type));
      if(type==='open'&&bulkUI.mode()){bulkUI.toggle(libraryItems[index]);return;}
      handleLibraryAction(type,index);
    };
    el?.addEventListener('click',activate);
    el?.addEventListener('keydown',activate);
    bulkUI.wireLongPress(el);
  }
  document.querySelectorAll('[data-tool]').forEach(el=>el.addEventListener('click',()=>openTool(el.dataset.tool)));
  document.getElementById('tools-query')?.addEventListener('input',event=>{
    const needle=event.target.value.trim().toLocaleLowerCase();let count=0;
    document.querySelectorAll('.rivo-hub-tile').forEach(el=>{
      el.hidden=!!needle&&!el.dataset.hubLabel.includes(needle);if(!el.hidden)count++;
    });
    document.querySelectorAll('.rivo-tools-section').forEach(section=>section.hidden=!!needle&&!section.querySelector('.rivo-hub-tile:not([hidden])'));
    document.getElementById('tools-no-results').hidden=count!==0;
  });
  document.querySelector('[data-tools-focus]')?.addEventListener('click',()=>document.getElementById('tools-query')?.focus());
  document.querySelectorAll('[data-hub-section]').forEach(el=>el.addEventListener('click',()=>{
    document.querySelectorAll('[data-hub-section]').forEach(b=>b.classList.toggle('active',b===el));
    const search=document.getElementById('tools-query');search.value='';search.dispatchEvent(new Event('input'));
    document.getElementById('section-'+el.dataset.hubSection)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  document.querySelectorAll('[data-hub-action]').forEach(el=>el.addEventListener('click',()=>openHubAction(el.dataset.hubAction)));
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>openTab('home')));
  document.querySelectorAll('[data-category]').forEach(el=>el.addEventListener('click',()=>{openTab('tools');document.getElementById('section-'+el.dataset.category)?.scrollIntoView({behavior:'smooth',block:'start'})}));
  document.querySelectorAll('[data-whats-new]').forEach(el=>el.addEventListener('click',()=>openWhatsNew({language,version:appVersion})));
  document.getElementById('language')?.addEventListener('change',e=>{language=e.target.value;localStorage.setItem('rivo-language',language);if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android')RivoDocuments.setLanguage({language}).catch(console.warn);render()});
  document.querySelectorAll('[data-scan-pref]').forEach(el=>el.addEventListener('change',e=>{
    const field=SCAN_PREF_FIELDS.find(item=>item.key===e.target.dataset.scanPref);
    if(!field)return;
    let value=field.type==='switch'?Boolean(e.target.checked):e.target.value;
    if(field.type!=='switch'&&field.options?.every(x=>typeof x==='number'))value=Number(value);
    try{updateScanPref(localStorage,field.key,value);toast(scanPrefsText(language).settingsSaved)}
    catch(error){console.warn('Scanner settings:',error);render();toast(String(error.message),true)}
  }));
  document.getElementById('sound-toggle')?.addEventListener('change',async e=>{
    soundsEnabled=Boolean(e.target.checked);
    localStorage.setItem('rivo-sounds',soundsEnabled?'on':'off');
    if(Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('RivoLiveScanner')){
      try{await RivoLiveScanner.setSoundSettings({enabled:soundsEnabled})}
      catch(error){console.warn('Native sound setting:',error)}
    }
    if(soundsEnabled)soundFeedback('saved');
  });
  document.getElementById('files')?.addEventListener('change',async e=>{const picked=[...e.target.files];e.target.value='';if(activeTool?.id==='scan'&&Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android')await editUploadedScanPhotos(picked);else addSelectedFiles(picked);});

  document.getElementById('camera')?.addEventListener('click',openCamera);
  document.getElementById('smart-scanner')?.addEventListener('click',()=>openLiveScanner());
  document.getElementById('mlkit-scanner')?.addEventListener('click',openSmartScanner);
  document.getElementById('scanner-gallery')?.addEventListener('click',()=>openLiveScanner({gallery:true}));
  if(activeTool?.id==='peerTransfer')closeTransfer=initPeerTransfer({onReceive:saveReceivedPeerFile,notify:toast,getLanguage:()=>language});
  document.getElementById('filelist')?.addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');const move=e.target.closest('[data-move]');if(remove){const index=+remove.dataset.remove;files.splice(index,1);scanRotations.splice(index,1)}if(move){const i=+move.dataset.move,j=i+Number(move.dataset.dir);if(j>=0&&j<files.length){[files[i],files[j]]=[files[j],files[i]];[scanRotations[i],scanRotations[j]]=[scanRotations[j],scanRotations[i]]}}updateFileDisplay()});
  document.getElementById('scanpreview')?.addEventListener('click',e=>{const b=e.target.closest('[data-turn]');if(!b)return;const i=+b.dataset.turn;scanRotations[i]=((scanRotations[i]||0)+90)%360;drawPreview()});
  document.getElementById('process')?.addEventListener('click',process);
  if(activeTool?.id==='sign')initSignature();
}
function openTool(id){const t=tools.find(item=>item.id===id);if(!t)return;docViewerUI.close();activeTool=t;files=[];scanRotations=[];window.scrollTo({top:0,behavior:'instant'});render()}
function pickHubFile(accept,cb){
 const input=document.createElement('input');input.type='file';input.accept=accept;
 input.onchange=()=>{const file=input.files?.[0];input.remove();if(file)Promise.resolve(cb(file)).catch(e=>{console.error(e);toast(e?.message||String(e),true)});};
 document.body.appendChild(input);input.click();
}
async function openHubAction(id){
 const spec=hubSpecial[id];
 if(!spec){openTool(id);return;}
 if(spec.type==='formulaOcr'){
   openFormulaReader({language,save:saveOut,notify:toast,capture:async()=>{
     const photo=await Camera.getPhoto({quality:92,allowEditing:false,
       resultType:CameraResultType.Uri,source:CameraSource.Camera});
     return photo.webPath||photo.path;
   }});
   return;
 }
 if(spec.type==='photoTranslation'){
   openPhotoTranslation({language,save:saveOut,notify:toast,capture:async()=>{
     const photo=await Camera.getPhoto({quality:92,allowEditing:false,
       resultType:CameraResultType.Uri,source:CameraSource.Camera});
     return photo.webPath||photo.path;
   }});
   return;
 }
 if(spec.type==='pdfLock'){
   openPDFLock({language,save:saveOut,notify:toast});return;
 }
 if(spec.type==='countCam'){
   openCountCam({language,capture:async()=>{
     const photo=await Camera.getPhoto({quality:90,allowEditing:false,
       resultType:CameraResultType.Uri,source:CameraSource.Camera});
     return photo.webPath||photo.path;
   }});
   return;
 }
 if(spec.type==='barcode'){
   openBarcodeScanner({language,notify:toast,capture:async()=>{
     const photo=await Camera.getPhoto({quality:90,allowEditing:false,
       resultType:CameraResultType.Uri,source:CameraSource.Camera});
     return photo.webPath||photo.path;
   }});
   return;
 }
 if(spec.type==='book'){
   openBookSplitter({language,save:saveOut,capture:async()=>{
     const photo=await Camera.getPhoto({quality:92,allowEditing:false,
       resultType:CameraResultType.Uri,source:CameraSource.Camera});
     return photo.webPath||photo.path;
   }});
   return;
 }
 if(spec.type==='idPhoto'){
   await openIDPhotoMaker({language,save:saveOut,notify:toast});
   return;
 }
 if(spec.type==='libraryPrint'){openLibrary();toast('Select a PDF and tap its print icon to open Android printing.');return}
 if(spec.type==='idcard'){await openLiveScanner({mode:'ID Card'});return}
 if(spec.type==='scan'){await openLiveScanner();return}
 if(spec.type==='import'){chooseLibraryFiles(spec.kind);return}
 if(spec.type==='pageManager'){
  const picker=document.createElement('input');picker.type='file';picker.accept='.pdf,application/pdf,image/*';picker.multiple=true;
  picker.onchange=async()=>{
    const picked=[...picker.files];picker.remove();if(!picked.length)return;
    try{
      let file;
      if(picked.length===1&&(/\.pdf$/i.test(picked[0].name)||picked[0].type==='application/pdf'))file=picked[0];
      else{
        if(picked.length>30||picked.some(f=>!/^image\//i.test(f.type))||picked.reduce((n,f)=>n+f.size,0)>30*1024*1024)
          throw Error('Select one PDF or up to 30 images (30 MB total).');
        showBusy('Preparing selected pages…');
        try{
          const pdf=await PDFDocument.create();
          for(let i=0;i<picked.length;i++){
            progress('Page '+(i+1)+'/'+picked.length);
            const canvas=await imageCanvas(picked[i]);
            const image=await pdf.embedJpg(await(await canvasBlob(canvas,'image/jpeg',.88)).arrayBuffer());
            const page=pdf.addPage([image.width,image.height]);
            page.drawImage(image,{x:0,y:0,width:image.width,height:image.height});
          }
          file=new File([await pdf.save({useObjectStreams:true})],'RivoScan_ManagedPhotos.pdf',{type:'application/pdf'});
        }finally{clearBusy()}
      }
      await openPageManager({file,getLanguage:()=>language,onSave:saveOut,
       onDone:async()=>{await loadLibrary(false);openLibrary()},onError:msg=>toast(msg,true)});
    }catch(error){toast(error?.message||String(error),true)}
  };
  document.body.appendChild(picker);picker.click();return;
 }
 if(spec.type==='export'){
  pickHubFile('.pdf,image/*',async file=>{
   showBusy('Converting locally…');
   try{await exportToolFile({file,format:spec.format,language,save:saveOut,progress})}
   finally{clearBusy()}
  });return;
 }
 if(spec.type==='photo'){
  pickHubFile('image/*',async file=>{
   if(file.size>16*1024*1024)throw Error('Image limit is 16 MB');
   const bytes=new Uint8Array(await file.arrayBuffer());
   const bridge={readFile:async()=>({base64:toBase64(bytes),mimeType:file.type||'image/jpeg'})};
   await openScanEditor({doc:{uri:'local',name:file.name,size:file.size,mimeType:file.type||'image/jpeg'},
    bridge,getLanguage:()=>language,preset:spec.preset,onSave:saveOut,
    onCrop:async()=>{const saved=await saveOut(bytes,file.name,file.type||'image/jpeg');if(saved?.uri)await openLiveScanner({imageUri:saved.uri})},
    onRetake:openCamera,onRefresh:async()=>{await loadLibrary(false)},notify:toast});
  });return;
 }
}
// Browser PDF libraries commonly keep multiple decoded copies in memory. Bound input sizes.
const MAX_FILE_BYTES=30*1024*1024, MAX_TOTAL_BYTES=90*1024*1024;
function addSelectedFiles(picked){
  const additions=[];
  for (const file of picked){
    const image=/\.(png|jpe?g|webp|bmp)$/i.test(file.name)||file.type==='image/png'||file.type==='image/jpeg'||file.type==='image/webp';
    const pdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
    const allowed=['shareFiles','peerTransfer'].includes(activeTool?.id)||(activeTool?.id==='bundle'?(image||pdf):activeTool?.id==='ocr'?(image||pdf):(['scan','images'].includes(activeTool?.id)?image:pdf));
    if(!allowed){toast(`Unsupported file type: ${file.name}`,true);continue;}
    if(file.size>MAX_FILE_BYTES){toast(`File too large (max 30 MB): ${file.name}`,true);continue;}
    additions.push(file);
  }
  const multiple=activeTool?.multiple, proposed=multiple?[...files,...additions]:additions.slice(0,1);
  if(proposed.reduce((sum,f)=>sum+f.size,0)>MAX_TOTAL_BYTES){toast('Files exceed 90 MB total. Try fewer files.',true);return;}
  files=proposed;scanRotations=files.map((_,i)=>scanRotations[i]||0);updateFileDisplay();
}


/** Android native: live green edge outline and manual four-corner editor. */
async function openLiveScanner({gallery=false,imageUri=null,mode='Document'}={}){
  if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android'){
    toast('Live edge detection requires the Android app.',true);
    return;
  }
  if(!Capacitor.isPluginAvailable('RivoLiveScanner')){
    console.warn('RivoLiveScanner is missing from this installed Android APK. Rebuild and reinstall the native app after running install-live-scanner.ps1.');
    toast('Live camera component missing in installed APK. Switching to Smart Scan.');
    await openSmartScanner();
    return;
  }
  try{
    const prefs=readScanPrefs(localStorage);
    const result=await RivoLiveScanner.scan({gallery,imageUri,language,mode,...prefs});
    await consumeSmartScan(result);
  }catch(err){
    const message=String(err?.message||err);
    if(/not implemented on android/i.test(message)){
      toast('Live camera component missing. Switching to Smart Scan.');
      await openSmartScanner();
    }else if(!/cancel|SCAN_CANCELLED/i.test(message)){
      console.error('Rivo live scanner:',err);
      toast('Live scanner could not open: '+(err?.message||'Check camera permission, sync and rebuild Android.'),true);
    }
  }
}
async function editUploadedScanPhotos(selected){
  if(!Capacitor.isPluginAvailable('RivoLiveScanner')){
    toast('Live corner editor is not installed. Open Smart Scan and choose the photo from your gallery.');
    await openSmartScanner();
    return;
  }
  for(const [index,file] of selected.entries()){
    if(file.size>MAX_FILE_BYTES){toast('Image exceeds 30 MB size limit.',true);continue;}
    try{
      const data=toBase64(new Uint8Array(await file.arrayBuffer()));
      const path='RivoScanImported/'+Date.now()+'_'+index+'.jpg';
      const saved=await Filesystem.writeFile({directory:Directory.Cache,path,data,recursive:true});
      await openLiveScanner({imageUri:saved.uri});
    }catch(err){toast('Could not import photo: '+(err?.message||err),true);}
  }
}

async function readScannedImage(uri,index){
  const name='RivoScan_Page_'+Date.now()+'_'+(index+1)+'.jpg';
  try {
    const result=await Filesystem.readFile({path:uri});
    if(typeof result.data==='string'){
      const encoded=result.data.includes(',')?result.data.split(',').pop():result.data;
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      return new File([bytes],name,{type:'image/jpeg'});
    }
    if(result.data instanceof Blob)return new File([result.data],name,{type:'image/jpeg'});
  } catch(err) {
    const local=Capacitor.convertFileSrc(uri),response=await fetch(local);
    if(!response.ok)throw new Error('Cannot read scanned page '+(index+1));
    return new File([await response.blob()],name,{type:'image/jpeg'});
  }
  throw new Error('Unsupported scanner image output.');
}
async function consumeSmartScan(result){
  if(!result?.scannedImages?.length){toast('No scanned pages were returned.',true);return;}
  if(activeTool?.id!=='scan')openTool('scan');
  const picked=[];
  for(let i=0;i<result.scannedImages.length;i++)picked.push(await readScannedImage(result.scannedImages[i],i));
  addSelectedFiles(picked);
  if(!picked.length)return;
  showBusy(dl('saving'));
  try{
    const prefs=readScanPrefs(localStorage);
    if(!prefs.autoSavePdf){
      toast(scanPrefsText(language).autoSavePdfHelp);
      return;
    }
    // Native CameraX has already performed perspective and color-safe Auto Clean.
    // Do NOT enhance the pixels again: this can fade colored stamps and handwriting.
    const pdf=result.scanMode==='ID Card'
      ?await idCardToPdf(picked)
      :await imagesToPdf('color',picked);
    const saved=await saveOut(pdf,`RivoScan_Scan_${Date.now()}.pdf`);
    openLibrary();
    toast(dl('savedNow')+' · '+picked.length+' '+sl('pages'));
  }catch(err){
    console.error('Scan auto-save failed:',err);
    toast('Scan captured but PDF save failed: '+(err?.message||err)+'. Use Save PDF to retry.',true);
  }finally{clearBusy();}
}
async function openSmartScanner(){
  if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android'){
    toast('Smart auto-crop needs the Android app. Use regular camera or photo upload on the web.',true);return;
  }
  try{
    const result=await DocumentScanner.scanDocument({galleryImportAllowed:true,pageLimit:20,resultFormats:'JPEG',scannerMode:'FULL'});
    await consumeSmartScan(result);
  }catch(err){
    if(!/cancel/i.test(String(err?.message||err)))toast('Smart scanner: '+(err?.message||'Unavailable. Check Google Play services.'),true);
  }
}
CapacitorApp.addListener('appRestoredResult',async event=>{
  if(event?.pluginId!=='DocumentScanner'||event?.methodName!=='scanDocument')return;
  try{
    if(event.success)await consumeSmartScan(event.data);
    else if(event.error?.message)toast('Scanner was interrupted: '+event.error.message,true);
  }catch(err){toast('Could not recover scan: '+err.message,true)}
}).catch(console.warn);

async function openCamera(){
  try{
    if(Capacitor.isNativePlatform()){
      // Basic photo mode uses the same reliable CameraX preview, without cropping.
      // Every captured photo is published to public Documents/RivoScan as JPG;
      // consumeSmartScan also assembles and saves its searchable PDF in that folder.
      if(Capacitor.getPlatform()==='android' && Capacitor.isPluginAvailable('RivoLiveScanner')){
        const result=await RivoLiveScanner.scan({basic:true,language});
        await consumeSmartScan(result);
        return;
      }
      // Backward compatibility for older APKs. The next installed build uses CameraX.
      const photo=await Camera.getPhoto({quality:90,source:CameraSource.Camera,resultType:CameraResultType.DataUrl,correctOrientation:true});
      if(!photo.dataUrl)throw new Error('Camera returned no image');
      const blob=await(await fetch(photo.dataUrl)).blob();
      const original=new File([blob],`RivoScan_Photo_${Date.now()}.jpg`,{type:'image/jpeg'});
      addSelectedFiles([original]);
      await saveOut(new Uint8Array(await blob.arrayBuffer()),original.name,'image/jpeg');
      const pdf=await imagesToPdf('color',[original]);
      await saveOut(pdf,`RivoScan_Scan_${Date.now()}.pdf`);
      openLibrary();
      return;
    }
    const el=document.createElement('input');el.type='file';el.accept='image/*';el.capture='environment';
    el.onchange=()=>{const f=el.files?.[0];if(f)addSelectedFiles([f])};
    el.click();
  }catch(err){if(!/cancel|SCAN_CANCELLED/i.test(String(err)))toast('Could not open camera: '+err.message,true)}
}
function toast(text,error=false){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=translateStatus(language,text);document.body.appendChild(el);setTimeout(()=>el.remove(),5000)}
function showBusy(message='Processing document…'){busy=true;const el=document.createElement('div');el.className='busy';el.innerHTML=`<div class="busy-inner"><div class="spinner"></div><strong id="busytext">${escapeHTML(translateStatus(language,message))}</strong><p>${translateStatus(language,'Processing locally. Please keep this app open.')}</p></div>`;document.body.appendChild(el)}
function progress(message){const el=document.getElementById('busytext');if(el)el.textContent=translateStatus(language,message)}
function clearBusy(){busy=false;document.querySelector('.busy')?.remove()}
function setting(name){return document.querySelector(`[name="${name}"]`)?.value?.trim()||''}
function requireFiles(min=1){if(files.length<min)throw Error(`Select at least ${min} file${min===1?'':'s'} first.`)}
const pdfFromFile=async f=>PDFDocument.load(await f.arrayBuffer());
function record(action){history.unshift({action,time:Date.now()});history=history.slice(0,10);localStorage.setItem('rivo-history',JSON.stringify(history));}
function blobToBytes(blob){return blob.arrayBuffer().then(b=>new Uint8Array(b))}
function toBase64(bytes){let out='';const chunk=16384;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.slice(i,i+chunk));return btoa(out)}
async function saveOut(bytes,name,mime='application/pdf'){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const safe=String(name||'RivoScan.pdf').replace(/[^\w.\-]/g,'_').slice(0,110);
  if(Capacitor.isNativePlatform()){
    if(Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('RivoDocuments')){
      // Genuine permanent public storage. MediaStore exposes Documents/RivoScan in Samsung My Files.
      const saved=await RivoDocuments.saveFile({name:safe,base64:toBase64(data),mimeType:mime});
      record(activeTool?.name||'Saved document');
      await loadLibrary(false);
      toast(dl('savedNow')+' ✓');
      soundFeedback('saved');
      return saved;
    }
    // Older Android fallback: persistent app Documents, never volatile Cache.
    const output=await Filesystem.writeFile({
      path:`RivoScan/${Date.now()}_${safe}`,data:toBase64(data),directory:Directory.Documents,recursive:true
    });
    record(activeTool?.name||'Saved document');
    toast('Saved in local app Documents. Public Documents/RivoScan storage requires the current Android app.');
    return output;
  }
  const url=URL.createObjectURL(new Blob([data],{type:mime}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=safe;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  record(activeTool?.name||'Download');
  toast('File downloaded successfully.');
}
function canvasBlob(canvas,type='image/jpeg',quality=.85){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image conversion failed')),type,quality))}
async function imageCanvas(file,filter='color',rotation=0){
 const url=URL.createObjectURL(file);let img;
 try{img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(Error('Unsupported image'));el.src=url})}finally{URL.revokeObjectURL(url)}
 const max=2100,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale);
 const canvas=document.createElement('canvas');const side=rotation%180!==0;canvas.width=side?h:w;canvas.height=side?w:h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.filter=filter==='enhance'?'contrast(1.18) brightness(1.08) saturate(.85)':filter==='gray'?'grayscale(1) contrast(1.14)':filter==='bw'?'grayscale(1) contrast(1.7) brightness(1.2)':'none';ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
 if(filter==='bw'){const im=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<im.data.length;i+=4){const v=im.data[i]>.64*255?255:0;im.data[i]=im.data[i+1]=im.data[i+2]=v}ctx.putImageData(im,0,0)}
 return canvas;
}

async function bundleDocuments(){
  const output=await PDFDocument.create();
  for(let i=0;i<files.length;i++){
    const f=files[i];progress('Combining document '+(i+1)+'/'+files.length);
    if(/\.pdf$/i.test(f.name)||f.type==='application/pdf'){
      const source=await pdfFromFile(f);
      const pages=await output.copyPages(source,source.getPageIndices());
      for(const page of pages)output.addPage(page);
    }else{
      const canvas=await imageCanvas(f,'enhance',0);
      const jpg=await output.embedJpg(await(await canvasBlob(canvas,'image/jpeg',.82)).arrayBuffer());
      const pw=595.28,ph=841.89,margin=15;
      const ratio=Math.min((pw-2*margin)/jpg.width,(ph-2*margin)/jpg.height);
      const page=output.addPage([pw,ph]),w=jpg.width*ratio,h=jpg.height*ratio;
      page.drawImage(jpg,{x:(pw-w)/2,y:(ph-h)/2,width:w,height:h});
    }
  }
  if(output.getPageCount()===0)throw Error('Select documents first.');
  return output.save({useObjectStreams:true});
}
async function shareSelectedFiles(){
  requireFiles(1);
  if(Capacitor.isNativePlatform()){
    const uris=[];
    for(let i=0;i<files.length;i++){
      progress('Preparing attachment '+(i+1)+'/'+files.length);
      const f=files[i],safe=f.name.replace(/[^\w.\-]/g,'_').slice(0,80)||'file';
      const b64=toBase64(new Uint8Array(await f.arrayBuffer()));
      const saved=await Filesystem.writeFile({directory:Directory.Cache,path:'RivoScanShare/'+Date.now()+'_'+i+'_'+safe,data:b64,recursive:true});
      uris.push(saved.uri);
    }
    await Share.share({title:'RivoScan file share',files:uris,dialogTitle:'Choose where to share'});
  }else if(typeof navigator.share==='function'&&navigator.canShare?.({files})){
    await navigator.share({files,title:'RivoScan files'});
  }else throw Error('Sharing attachments is not supported in this browser. Use Android.');
}
async function saveReceivedPeerFile(bytes,name,mime){
  await saveOut(bytes,name,mime);
}
function peerWorkspace(){
 const copy={
  en:['Direct device transfer','Share your files privately using a one-time pairing code. Both devices must be connected.','Create sender code','Accept sender code','Complete connection','My code','Code from the other device','Copy code','Choose documents','Send selected files','Connection not yet established','No cloud link is generated. Pairing is manual and some networks may block direct connections.'],
  ar:['نقل مباشر بين الأجهزة','صيفط الوثائق مباشرة برمز ربط مؤقت. خاص الجهازين يكونو متصلين.','إنشاء رمز الإرسال','قبول رمز المرسل','إتمام الربط','الكود ديالي','كود الجهاز الآخر','نسخ الرمز','اختار الوثائق','صيفط الوثائق','مازال ما اتصلناش','ما كننشئوش رابط سحابي عام؛ الربط يدوي وبعض الشبكات تقدر تمنع الاتصال المباشر.'],
  fr:['Transfert direct','Envoyez vos documents via un code temporaire entre deux appareils connectés.','Créer un code','Accepter le code','Terminer la connexion','Mon code','Code du correspondant','Copier le code','Choisir des fichiers','Envoyer','Non connecté','Aucun lien cloud. L’appairage est manuel et certains réseaux peuvent bloquer la connexion.'],
  es:['Transferencia directa','Comparte archivos usando un código temporal de vinculación.','Crear código','Aceptar código','Completar conexión','Mi código','Código remoto','Copiar código','Elegir documentos','Enviar','Sin conexión','No se crea enlace público. Puede fallar en ciertas redes.'],
  de:['Direkte Übertragung','Dateien per einmaligem Kopplungscode austauschen.','Code erstellen','Code annehmen','Verbinden','Mein Code','Code des Partners','Code kopieren','Dateien auswählen','Senden','Nicht verbunden','Kein öffentlicher Cloud-Link. Einige Netzwerke verhindern direkte Verbindungen.'],
  pt:['Transferência direta','Partilhe ficheiros com código temporário entre dispositivos.','Criar código','Aceitar código','Concluir ligação','O meu código','Código remoto','Copiar código','Selecionar ficheiros','Enviar','Desligado','Sem link público. Algumas redes bloqueiam ligações diretas.'],
  it:['Trasferimento diretto','Condividi i file con un codice di collegamento temporaneo.','Crea codice','Accetta codice','Completa connessione','Il mio codice','Codice remoto','Copia codice','Seleziona file','Invia','Non connesso','Nessun link cloud pubblico. Alcune reti bloccano il collegamento diretto.']
 };
 const w=copy[language]||copy.en;
 return `<section class="workspace rivo-peer-workspace">
   <button class="back" data-go="home">${ico('back',18)} ${ut('home')}</button>
   <div class="page-heading"><h1>${w[0]}</h1><p>${w[1]}</p></div>
   <div class="panel rivo-peer-panel">
     <p class="hint">${w[11]}</p>
     <div class="rivo-peer-actions">
       <button id="peer-offer" type="button">${w[2]}</button>
       <button id="peer-answer" type="button">${w[3]}</button>
       <button id="peer-connect" type="button">${w[4]}</button>
     </div>
     <label class="field"><span>${w[5]}</span><textarea id="peer-local" rows="3" readonly></textarea></label>
     <button id="peer-copy" class="btn btn-outline" type="button">${ico('file',18)} ${w[7]}</button>
     <label class="field"><span>${w[6]}</span><textarea id="peer-remote" rows="3" autocomplete="off" spellcheck="false"></textarea></label>
     <p role="status" class="rivo-peer-status" id="peer-status">${w[10]}</p>
     <label class="rivo-peer-file-picker"><span>${w[8]}</span><input type="file" id="peer-files" multiple></label>
     <button class="btn operation" id="peer-send" type="button" disabled>${ico('upload',19)} ${w[9]}</button>
   </div>
 </section>`;
}

/** Two-sided ID card: front and back on ONE portrait A4 page. */
async function idCardToPdf(pages){
 const pdf=await PDFDocument.create(),page=pdf.addPage([595.28,841.89]);
 const width=507,height=299,margin=44;
 const font=await pdf.embedFont(StandardFonts.HelveticaBold);
 page.drawText('ID CARD — FRONT / BACK',{x:margin,y:795,size:14,font,color:rgb(.10,.31,.67)});
 for(let i=0;i<Math.min(2,pages.length);i++){
  const canvas=await imageCanvas(pages[i],'color');
  const file=await canvasBlob(canvas,'image/jpeg',readScanPrefs(localStorage).pdfQuality);
  const image=await pdf.embedJpg(await file.arrayBuffer());
  const slotY=i===0?438:105;
  page.drawRectangle({x:margin,y:slotY,width,height,borderWidth:1.5,
   borderColor:rgb(.57,.74,.97),color:rgb(1,1,1)});
  const fit=Math.min((width-22)/image.width,(height-28)/image.height);
  const w=image.width*fit,h=image.height*fit;
  page.drawImage(image,{x:margin+(width-w)/2,y:slotY+(height-h)/2,width:w,height:h});
  page.drawText(i===0?'FRONT':'BACK',{x:margin+7,y:slotY+height-18,size:9,font,
   color:rgb(.13,.41,.77)});
 }
 return pdf.save({useObjectStreams:true});
}
async function imagesToPdf(filter,sourceFiles=files){
 const pdf=await PDFDocument.create();for(let i=0;i<sourceFiles.length;i++){
  progress(`Preparing image ${i+1} / ${sourceFiles.length}`);
  const prefs=readScanPrefs(localStorage);
  const canvas=await imageCanvas(sourceFiles[i],filter,sourceFiles===files?(scanRotations[i]||0):0),blob=await canvasBlob(canvas,'image/jpeg',Number(setting('quality')||prefs.pdfQuality));
  const image=await pdf.embedJpg(await blob.arrayBuffer());const [pw,ph]=readScanPrefs(localStorage).pageSize==='letter'?[612,792]:[595.28,841.89],margin=18;
  const ratio=Math.min((pw-2*margin)/image.width,(ph-2*margin)/image.height);const width=image.width*ratio,height=image.height*ratio;
  const page=pdf.addPage([pw,ph]);page.drawImage(image,{x:(pw-width)/2,y:(ph-height)/2,width,height});
 }
 return pdf.save({useObjectStreams:true});
}
async function renderPage(pdf,pageNum,scale=1.5){
 const page=await pdf.getPage(pageNum);const vp=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);await page.render({canvasContext:canvas.getContext('2d'),canvas,viewport:vp}).promise;page.cleanup();return canvas;
}
async function pdfjsOpen(f){return pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer()),useSystemFonts:true}).promise}
async function mergePdfs(){requireFiles(2);const out=await PDFDocument.create();for(let i=0;i<files.length;i++){progress(`Merging ${i+1} / ${files.length}`);const src=await pdfFromFile(files[i]);const copied=await out.copyPages(src,src.getPageIndices());for(const p of copied)out.addPage(p)}return out.save({useObjectStreams:true})}
async function editPages(id){const src=await pdfFromFile(files[0]),total=src.getPageCount();let pdf=src;
 if(id==='split'||id==='delete'||id==='reorder'){
  const indices=parsePages(setting('pages'),total,{requireUnique:id==='reorder'});
  const keep=id==='delete'?src.getPageIndices().filter(x=>!indices.includes(x)):indices;
  if(id==='reorder'&&(keep.length!==total||new Set(keep).size!==total))throw Error(`Reorder must include all ${total} pages exactly once.`);
  if(!keep.length)throw Error('You cannot create a PDF without pages.');
  pdf=await PDFDocument.create();const pages=await pdf.copyPages(src,keep);pages.forEach(p=>pdf.addPage(p));
 }else if(id==='rotate'){
  const indices=parsePages(setting('pages'),total,{allowEmpty:true});for(const i of new Set(indices)){const p=pdf.getPage(i);p.setRotation(degrees(((p.getRotation().angle+Number(setting('angle')))%360)))}
 }return pdf.save({useObjectStreams:true});
}
function noteImage(text,opacity=.8){
 const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=165;const c=canvas.getContext('2d');c.clearRect(0,0,1400,165);c.font='bold 64px system-ui,Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=`rgba(50,65,102,${opacity})`;c.fillText(text,700,84,1300);return canvas.toDataURL('image/png');
}
async function annotatePdf(id){const doc=await pdfFromFile(files[0]);
 if(id==='numbers'){
  const font=await doc.embedFont(StandardFonts.Helvetica),start=Number(setting('start'))||1;doc.getPages().forEach((page,i)=>{const text=String(i+start),w=font.widthOfTextAtSize(text,11);const top=setting('position')==='top';page.drawText(text,{x:top?page.getWidth()-w-30:(page.getWidth()-w)/2,y:top?page.getHeight()-28:20,size:11,font,color:rgb(.38,.42,.52)})});
 } else if(id==='watermark'||id==='text'){
  const watermark=id==='watermark';const value=setting(watermark?'watermark':'note');if(!value)throw Error('Enter text to add.');
  const data=noteImage(value,watermark?Number(setting('opacity'))/100:1);const bytes=await blobToBytes(await(await fetch(data)).blob());const img=await doc.embedPng(bytes);
  doc.getPages().forEach(page=>{const width=Math.min(page.getWidth()*.75,440),height=width*img.height/img.width;const pos=setting('position');const x=(page.getWidth()-width)/2,y=watermark||pos==='center'?(page.getHeight()-height)/2:pos==='top'?page.getHeight()-height-25:25;page.drawImage(img,{x,y,width,height,rotate:watermark?degrees(28):degrees(0),opacity:watermark?.75:1})});
 }else if(id==='sign'){
  if(!signatureHasInk)throw Error('Draw your signature first.');
  const canvas=document.getElementById('signpad');if(!canvas)throw Error('Signature canvas missing.');
  const png=await doc.embedPng(await blobToBytes(await canvasBlob(canvas,'image/png')));const number=Number(setting('page'));if(!Number.isInteger(number)||number<1||number>doc.getPageCount())throw Error(`Choose a page from 1 to ${doc.getPageCount()}.`);
  const page=doc.getPage(number-1),width=Math.min(180,page.getWidth()*.4),height=width*png.height/png.width;
  const x=setting('position')==='center'?(page.getWidth()-width)/2:page.getWidth()-width-37,y=setting('position')==='center'?(page.getHeight()-height)/2:55;
  page.drawImage(png,{x,y,width,height});
 }else if(id==='metadata'){
  doc.setTitle('');doc.setAuthor('');doc.setSubject('');doc.setKeywords([]);doc.setCreator('');doc.setProducer('');
 }
 return doc.save({useObjectStreams:true});
}
async function pdfToImages(){const pdf=await pdfjsOpen(files[0]);try{
 if(pdf.numPages>40)throw Error('For device stability, export up to 40 pages at a time.');
 const zip=new JSZip(),fmt=setting('format')||'jpeg';for(let i=1;i<=pdf.numPages;i++){
  progress(`Exporting page ${i}/${pdf.numPages}`);const canvas=await renderPage(pdf,i,Number(setting('scale'))||1.5);const blob=await canvasBlob(canvas,fmt==='png'?'image/png':'image/jpeg',.9);zip.file(`page-${String(i).padStart(3,'0')}.${fmt==='png'?'png':'jpg'}`,blob);
 }
 return new Uint8Array(await zip.generateAsync({type:'uint8array'}));
 }finally{await pdf.destroy()}}
async function compressPdf(){const source=await pdfjsOpen(files[0]);try{
 const out=await PDFDocument.create();if(source.numPages>70)throw Error('For device stability, process PDFs of 70 pages or fewer.');
 for(let i=1;i<=source.numPages;i++){
  progress(`Compressing page ${i}/${source.numPages}`);const p=await source.getPage(i),viewport=p.getViewport({scale:1});const scale=Math.min(1.15,1450/Math.max(viewport.width,viewport.height));const canvas=await renderPage(source,i,scale);const jpg=await out.embedJpg(await(await canvasBlob(canvas,'image/jpeg',Number(setting('quality'))||.58)).arrayBuffer());const page=out.addPage([viewport.width,viewport.height]);page.drawImage(jpg,{x:0,y:0,width:viewport.width,height:viewport.height});
 }return out.save({useObjectStreams:true});
 }finally{await source.destroy()}}
async function pdfToText(ocr=false){
 const source=files[0];let lines=[];
 if(ocr){
  const isPdf=source.type==='application/pdf'||/\.pdf$/i.test(source.name);
  if(isPdf){const doc=await pdfjsOpen(source);try{if(doc.numPages>20)throw Error('OCR currently supports up to 20 pages per PDF.');for(let i=1;i<=doc.numPages;i++){
    progress(`OCR page ${i}/${doc.numPages} • first use may download language files`);
    const canvas=await renderPage(doc,i,1.6);const result=await recognize(canvas,setting('ocrLang')||'eng');lines.push(`--- Page ${i} ---\n${result.data.text}`);
  }}finally{await doc.destroy()}}
  else{progress('Recognizing image text • first use may download language files');const result=await recognize(source,setting('ocrLang')||'eng');lines=[result.data.text]}
 }else{
  const doc=await pdfjsOpen(source);try{for(let i=1;i<=doc.numPages;i++){
   progress(`Extracting page ${i}/${doc.numPages}`);const page=await doc.getPage(i),text=await page.getTextContent();lines.push(`--- Page ${i} ---\n${text.items.map(x=>x.str).join(' ')}`);
  }}finally{await doc.destroy()}}
 return new TextEncoder().encode(lines.join('\n\n'));
}
async function process(){
 if(busy)return;
 try{
  requireFiles(activeTool?.id==='merge'?2:1);
  showBusy('Preparing your document…');
  if(activeTool?.id==='shareFiles'){await shareSelectedFiles();return;}
  const id=activeTool.id;let bytes,name,mime='application/pdf';
  switch(id){
   case 'scan':case 'images':bytes=await imagesToPdf(id==='scan'?setting('filter'):'color');name=`RivoScan_${Date.now()}.pdf`;break;
   case 'bundle':bytes=await bundleDocuments();name=`Combined_Documents_${Date.now()}.pdf`;break;
   case 'merge':bytes=await mergePdfs();name=`Merged_${Date.now()}.pdf`;break;
   case 'split':case 'delete':case 'reorder':case 'rotate':bytes=await editPages(id);name=`${fname(files[0].name)}_${id}.pdf`;break;
   case 'numbers':case 'watermark':case 'text':case 'sign':case 'metadata':bytes=await annotatePdf(id);name=`${fname(files[0].name)}_${id}.pdf`;break;
   case 'pdftoimages':bytes=await pdfToImages();name=`${fname(files[0].name)}_images.zip`;mime='application/zip';break;
   case 'extractText':case 'ocr':bytes=await pdfToText(id==='ocr');name=`${fname(files[0].name)}_${id}.txt`;mime='text/plain';break;
   case 'compress':bytes=await compressPdf();name=`${fname(files[0].name)}_compressed.pdf`;break;
   default:throw Error('Unsupported tool.');
  }
  await saveOut(bytes,name,mime);
 }catch(e){console.error(e);toast(e?.message||'Something went wrong processing this file.',true)}finally{clearBusy()}
}
let signatureHasInk=false;
function initSignature(){
 const canvas=document.getElementById('signpad');if(!canvas)return;const rect=canvas.getBoundingClientRect(),ratio=Math.max(1,window.devicePixelRatio||1);canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.strokeStyle='#26315a';ctx.lineWidth=2.8;ctx.lineJoin='round';ctx.lineCap='round';let drawing=false;
 const xy=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
 canvas.addEventListener('pointerdown',e=>{drawing=true;signatureHasInk=true;canvas.setPointerCapture(e.pointerId);const [x,y]=xy(e);ctx.beginPath();ctx.moveTo(x,y)});
 canvas.addEventListener('pointermove',e=>{if(!drawing)return;const[x,y]=xy(e);ctx.lineTo(x,y);ctx.stroke()});
 canvas.addEventListener('pointerup',()=>drawing=false);canvas.addEventListener('pointercancel',()=>drawing=false);
 document.getElementById('clear-sign')?.addEventListener('click',()=>{ctx.clearRect(0,0,rect.width,rect.height);signatureHasInk=false});signatureHasInk=false;
}
render();
try{
 if(shouldShowReleaseNotes(localStorage,appVersion))
  requestAnimationFrame(()=>openWhatsNew({language,version:appVersion}));
}catch(error){console.warn('Release notes unavailable:',error)}
if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){
  const syncNativeSoundSetting=()=>{
    if(!Capacitor.isPluginAvailable('RivoLiveScanner'))return;
    RivoLiveScanner.getSoundSettings().then(result=>{
      soundsEnabled=result.enabled!==false;
      localStorage.setItem('rivo-sounds',soundsEnabled?'on':'off');
      const control=document.getElementById('sound-toggle');
      if(control)control.checked=soundsEnabled;
    }).catch(console.warn);
  };
  syncNativeSoundSetting();
  loadLibrary(false);
  CapacitorApp.addListener('appStateChange',({isActive})=>{
    if(isActive){
      loadLibrary(activeTool?.id==='library');
      syncNativeSoundSetting();
    }
  }).catch(console.warn);
}
