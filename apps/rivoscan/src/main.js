import './style.css';
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
import { App as CapacitorApp } from '@capacitor/app';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';
import { initPeerTransfer } from './file-transfer.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const RivoLiveScanner = registerPlugin('RivoLiveScanner');

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
  lock:'<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
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
let activeTool = null;
let files = [];
let scanRotations = [];
let busy = false;
let history = [];
try { history = JSON.parse(localStorage.getItem('rivo-history') || '[]'); if (!Array.isArray(history)) history = []; } catch { history = []; }
let previewURLs = [];
let closeTransfer = null;
const app = document.getElementById('app');
const tr = (key) => translations[language]?.[key] || translations.en[key] || key;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fname = (name) => String(name).replace(/\.[^.]+$/,'').replace(/[^\w\- .]/g,'_').slice(0,60) || 'document';
const formatSize = (n)=>n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
const groupTitle = {create:'create',organize:'organize',edit:'edit',convert:'convert'};
function render(){
  if(closeTransfer){closeTransfer();closeTransfer=null;}
  previewURLs.forEach(u=>URL.revokeObjectURL(u));previewURLs=[];
  document.documentElement.lang=language; document.body.dir=language==='ar'?'rtl':'ltr';
  const aside = `<aside class="sidebar"><div class="brand"><img src="/rivoscan-icon.png" alt="RivoScan scanner icon"><div><strong>RivoScan</strong><small>BY RIBHLAB</small></div></div><div class="nav-label">WORKSPACE</div><button class="nav-button ${!activeTool?'active':''}" data-go="home">${ico('home')} ${tr('home')}</button><div class="nav-label">PDF TOOLS</div>${Object.keys(groupTitle).map(g=>`<button class="nav-button" data-category="${g}">${ico(g==='create'?'scan':g==='organize'?'merge':g==='edit'?'sign':'convert')} ${tr(g)}</button>`).join('')}<div class="sidebar-bottom"><div class="secure-mark">${ico('shield')} ${tr('secure')}</div><p>${tr('privacy')}</p></div></aside>`;
  const header = `<header class="topbar"><span class="crumb"><img class="topbar-brand-icon" src="/rivoscan-icon.png" alt=""> RivoScan <span style="color:#c7cfdf">/</span> ${activeTool?escapeHTML(activeTool.name):tr('home')}</span><div class="topright"><select id="language" class="lang" aria-label="Language">${[['en','English'],['fr','Français'],['ar','العربية'],['es','Español'],['de','Deutsch'],['pt','Português'],['it','Italiano']].map(([id,label])=>`<option value="${id}" ${language===id?'selected':''}>${label}</option>`).join('')}</select><div class="avatar">R</div></div></header>`;
  const mobile = `<nav class="mobilebar"><button data-go="home" class="${!activeTool?'active':''}">${ico('home')}${tr('home')}</button><button data-tool="scan" class="${activeTool?.id==='scan'?'active':''}">${ico('scan')}Scan</button><button data-tool="merge">${ico('merge')}Merge</button><button data-tool="sign">${ico('sign')}Sign</button><button data-tool="ocr">${ico('ocr')}OCR</button></nav>`;
  app.innerHTML=`<div class="shell">${aside}<main class="main">${header}<div class="content">${activeTool?workspace():home()}</div></main>${mobile}</div>`;
  wire();
}
function home(){
  const groups=[['create','Scan & create'],['organize','Organize PDF'],['edit','Edit & protect'],['convert','Convert & extract']];
  return `<div class="hero"><div class="hero-copy"><span class="eyebrow">SMART PDF WORKSPACE</span><h1>${tr('hero')}</h1><p>${tr('desc')}</p><button class="btn btn-white" data-tool="scan">${ico('scan')} ${tr('start')}</button></div><div class="hero-art"><img src="/rivoscan-logo.png" alt="RivoScan scanner brand logo"></div></div><div class="stats-row"><div class="stat">${ico('shield',23)}<div><b>100% Local</b><small>Core PDF operations</small></div></div><div class="stat">${ico('file',23)}<div><b>${tools.length} Tools</b><small>Document toolkit</small></div></div><div class="stat">${ico('check',23)}<div><b>No account</b><small>Start immediately</small></div></div></div>${groups.map(([id,label])=>`<section id="section-${id}"><div class="section-head"><h2>${tr(id)}</h2><span>${tools.filter(t=>t.category===id).length} tools</span></div><div class="tools-grid">${tools.filter(t=>t.category===id).map(card).join('')}</div></section>`).join('')}<div class="section-head"><h2>${tr('files')}</h2><span>Recent actions, filenames not stored</span></div><div class="panel">${history.length?history.slice(0,5).map(h=>`<div class="file">${ico('clock',17)}<b>${escapeHTML(h.action)}</b><small>${new Date(h.time).toLocaleString()}</small></div>`).join(''):'<div class="empty">No activity yet. Choose a tool to start.</div>'}</div><div class="footer">RivoScan • RibhLab • Beta v0.2 • Documents stay on your device. OCR language data may be downloaded from Tesseract infrastructure when first used.</div>`;
}
function card(t){return `<button class="tool-card" data-tool="${t.id}"><div class="tool-icon ${t.color}">${ico(t.icon,24)}</div><b>${escapeHTML(t.name)}</b><small>${escapeHTML(t.desc)}</small></button>`;}
const opts = {
  split: `<div class="field"><label>Pages to keep (e.g. 1-3, 5, 8)</label><input name="pages" placeholder="1-3, 5, 8" value="1-3"></div><p class="hint">Select only the pages you want in the new PDF.</p>`,
  delete:`<div class="field"><label>Pages to remove</label><input name="pages" placeholder="2, 4-6" value="2"></div>`,
  rotate:`<div class="field"><label>Pages to rotate (empty = all)</label><input name="pages" placeholder="1, 3-5"></div><div class="field"><label>Rotation</label><select name="angle"><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></div>`,
  reorder:`<div class="field"><label>New page order (one-based)</label><input name="pages" placeholder="3, 1, 2, 4" value="2, 1"></div><p class="hint">List ALL pages exactly once. Example for a 3-page PDF: 3, 1, 2.</p>`,
  numbers:`<div class="field"><label>Starting page number</label><input name="start" type="number" min="1" value="1"></div><div class="field"><label>Position</label><select name="position"><option value="bottom">Bottom center</option><option value="top">Top right</option></select></div>`,
  watermark:`<div class="field"><label>Watermark text</label><input name="watermark" value="CONFIDENTIAL" maxlength="80"></div><div class="field"><label>Opacity</label><input type="range" name="opacity" min="10" max="70" value="23"></div>`,
  text:`<div class="field"><label>Text to add on each page</label><textarea name="note" rows="3" placeholder="Your annotation"></textarea></div><div class="field"><label>Position</label><select name="position"><option value="top">Top</option><option value="bottom">Bottom</option><option value="center">Center</option></select></div>`,
  sign:`<div class="field"><label>Draw signature (finger / mouse)</label><canvas id="signpad" class="signpad" aria-label="Signature drawing pad"></canvas><button class="btn btn-outline" style="margin-top:8px" id="clear-sign">Clear signature</button></div><div class="field"><label>Page number</label><input name="page" type="number" min="1" value="1"></div><div class="field"><label>Position</label><select name="position"><option value="bottom">Bottom right</option><option value="center">Center</option></select></div><p class="hint">This places a visual signature; it is not a cryptographic digital signature.</p>`,
  scan:`<p class="hint">LIVE CAMERA: Watch a green outline follow the paper. Capture, drag four corners to adjust them, then Save page. GALLERY: Import an existing photo, adjust its corners and save. Multiple saved pages become one PDF.</p><div class="field"><label>Scan appearance</label><select name="filter"><option value="color">Original color</option><option value="enhance" selected>Enhanced document</option><option value="gray">Black & white (grayscale)</option><option value="bw">High contrast monochrome</option></select></div><div class="field"><label>Image quality</label><select name="quality"><option value=".85">High</option><option value=".65" selected>Balanced</option><option value=".45">Smaller file</option></select></div>`,
  images:`<div class="field"><label>Image quality</label><select name="quality"><option value=".95">High</option><option value=".75" selected>Balanced</option><option value=".5">Smaller file</option></select></div>`,
  pdftoimages:`<div class="field"><label>Image format</label><select name="format"><option value="jpeg">JPG</option><option value="png">PNG</option></select></div><div class="field"><label>Resolution</label><select name="scale"><option value="1">Standard</option><option value="1.5" selected>High</option><option value="2">Extra high</option></select></div>`,
  compress:`<div class="field"><label>Compression quality</label><select name="quality"><option value=".38">Smaller file</option><option value=".58" selected>Balanced</option><option value=".78">Higher quality</option></select></div><p class="hint">Best for scanned PDFs. Pages are converted to images, so existing selectable text, links and forms may be lost. Results are not guaranteed to be smaller.</p>`,
  ocr:`<div class="field"><label>OCR language</label><select name="ocrLang"><option value="eng" selected>English</option><option value="fra">Français</option><option value="ara">العربية</option><option value="spa">Español</option><option value="deu">Deutsch</option><option value="por">Português</option><option value="ita">Italiano</option></select></div><p class="hint">First OCR use may download trained language data. OCR depends on image quality and can take time.</p>`,
  metadata:`<p class="hint">Clears commonly used metadata fields. Not a guarantee of forensic sanitization; embedded content, comments or hidden data may remain.</p>`
};
function workspace(){
  const t=activeTool;
  if(t.id==='peerTransfer')return peerWorkspace();
  return `<section class="workspace"><button class="back" data-go="home">${ico('back')} All tools</button><div class="work-title"><div class="tool-icon ${t.color}">${ico(t.icon,24)}</div><div><h1>${escapeHTML(t.name)}</h1><p>${escapeHTML(t.desc)}</p></div></div><div class="work-grid"><div class="panel"><h3>${tr('select')}</h3><label class="dropzone"><div class="uploadicon">${ico('upload',26)}</div><strong>${tr('upload')}</strong><span>${tr('drop')}</span><span style="font-weight:700;color:#5661db">${escapeHTML(t.id==='bundle'?'PDF, JPG & PNG':t.id==='shareFiles'?'Any file format':t.accept.includes('image/')?'JPG, PNG & photos':'PDF documents')}</span><input id="files" aria-label="Select files" type="file" accept="${t.accept}" ${t.multiple?'multiple':''}></label>${t.id==='scan'?`<button class="btn" id="smart-scanner" style="width:100%;margin-top:12px">${ico('scan')} Open Live Camera · Detect Edges</button><button class="btn btn-light" id="scanner-gallery" style="width:100%;margin-top:8px">${ico('image')} Import Photo · Adjust 4 Corners</button><button class="btn btn-light" id="camera" style="width:100%;margin-top:8px">${ico('camera')} Basic camera (no auto-crop)</button>`:''}<div class="filelist" id="filelist">${renderFiles()}</div><div id="scanpreview"></div></div><div class="panel"><h3>Options</h3><div id="options">${opts[t.id]||'<p class="hint">Your file will be processed locally on this device.</p>'}</div><button class="btn operation" id="process">${ico('download')} ${tr('run')}</button><div class="privacy">${ico('lock',17)} <span>${tr('privacy')}</span></div><p class="hint" style="margin-top:14px">PDFs with passwords or unsupported encryption may not open. Large files may require more device memory.</p></div></div></section>`;
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
  document.querySelectorAll('[data-tool]').forEach(el=>el.addEventListener('click',()=>openTool(el.dataset.tool)));
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>{activeTool=null;files=[];scanRotations=[];render()}));
  document.querySelectorAll('[data-category]').forEach(el=>el.addEventListener('click',()=>{activeTool=null;files=[];render();document.getElementById('section-'+el.dataset.category)?.scrollIntoView({behavior:'smooth'})}));
  document.getElementById('language')?.addEventListener('change',e=>{language=e.target.value;localStorage.setItem('rivo-language',language);render()});
  document.getElementById('files')?.addEventListener('change',async e=>{const picked=[...e.target.files];e.target.value='';if(activeTool?.id==='scan'&&Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android')await editUploadedScanPhotos(picked);else addSelectedFiles(picked);});
  document.querySelector('.dropzone')?.addEventListener('click',e=>{if(activeTool?.id==='scan'&&Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){e.preventDefault();openLiveScanner({gallery:true});}});
  document.getElementById('camera')?.addEventListener('click',openCamera);
  document.getElementById('smart-scanner')?.addEventListener('click',()=>openLiveScanner());
  document.getElementById('scanner-gallery')?.addEventListener('click',()=>openLiveScanner({gallery:true}));
  if(activeTool?.id==='peerTransfer')closeTransfer=initPeerTransfer({onReceive:saveReceivedPeerFile,notify:toast});
  document.getElementById('filelist')?.addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');const move=e.target.closest('[data-move]');if(remove){const index=+remove.dataset.remove;files.splice(index,1);scanRotations.splice(index,1)}if(move){const i=+move.dataset.move,j=i+Number(move.dataset.dir);if(j>=0&&j<files.length){[files[i],files[j]]=[files[j],files[i]];[scanRotations[i],scanRotations[j]]=[scanRotations[j],scanRotations[i]]}}updateFileDisplay()});
  document.getElementById('scanpreview')?.addEventListener('click',e=>{const b=e.target.closest('[data-turn]');if(!b)return;const i=+b.dataset.turn;scanRotations[i]=((scanRotations[i]||0)+90)%360;drawPreview()});
  document.getElementById('process')?.addEventListener('click',process);
  if(activeTool?.id==='sign')initSignature();
}
function openTool(id){const t=tools.find(item=>item.id===id);if(!t)return;activeTool=t;files=[];scanRotations=[];window.scrollTo({top:0,behavior:'instant'});render()}
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
async function openLiveScanner({gallery=false,imageUri=null}={}){
  if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android'){
    toast('Live edge detection requires the Android app.',true);
    return;
  }
  try{
    const result=await RivoLiveScanner.scan({gallery,imageUri});
    await consumeSmartScan(result);
  }catch(err){
    if(!/cancel|SCAN_CANCELLED/i.test(String(err?.message||err))){
      console.error('Rivo live scanner:',err);
      toast('Live scanner could not open: '+(err?.message||'Install the native scanner update and grant camera permission.'),true);
    }
  }
}
async function editUploadedScanPhotos(selected){
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
  toast(picked.length+' corrected page(s) added. Add more pages or tap Process & Save for a single PDF.');
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
 try{if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){await openLiveScanner();return;}
 if(Capacitor.isNativePlatform()){
   const photo=await Camera.getPhoto({quality:90,source:CameraSource.Camera,resultType:CameraResultType.DataUrl,correctOrientation:true});
   const blob=await (await fetch(photo.dataUrl)).blob();addSelectedFiles([new File([blob],`Scan_${Date.now()}.jpg`,{type:'image/jpeg'})]);
 }else{const el=document.createElement('input');el.type='file';el.accept='image/*';el.capture='environment';el.onchange=()=>{const f=el.files?.[0];if(f){addSelectedFiles([f])}};el.click()}}
 catch(err){if(!/cancel/i.test(String(err)))toast('Could not open camera: '+err.message,true)}
}
function toast(text,error=false){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),5000)}
function showBusy(message='Processing document…'){busy=true;const el=document.createElement('div');el.className='busy';el.innerHTML=`<div class="busy-inner"><div class="spinner"></div><strong id="busytext">${escapeHTML(message)}</strong><p>Processing locally. Please keep this app open.</p></div>`;document.body.appendChild(el)}
function progress(message){const el=document.getElementById('busytext');if(el)el.textContent=message}
function clearBusy(){busy=false;document.querySelector('.busy')?.remove()}
function setting(name){return document.querySelector(`[name="${name}"]`)?.value?.trim()||''}
function requireFiles(min=1){if(files.length<min)throw Error(`Select at least ${min} file${min===1?'':'s'} first.`)}
const pdfFromFile=async f=>PDFDocument.load(await f.arrayBuffer());
function record(action){history.unshift({action,time:Date.now()});history=history.slice(0,10);localStorage.setItem('rivo-history',JSON.stringify(history));}
function blobToBytes(blob){return blob.arrayBuffer().then(b=>new Uint8Array(b))}
function toBase64(bytes){let out='';const chunk=16384;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.slice(i,i+chunk));return btoa(out)}
async function saveOut(bytes,name,mime='application/pdf'){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(Capacitor.isNativePlatform()){
    const safe=name.replace(/[^\w.\-]/g,'_');
    const entry=await Filesystem.writeFile({path:`RivoScan/${Date.now()}_${safe}`,data:toBase64(data),directory:Directory.Cache,recursive:true});
    await Share.share({title:`RivoScan • ${name}`,files:[entry.uri],dialogTitle:'Save or share file'});
  } else {
    const url=URL.createObjectURL(new Blob([data],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  record(activeTool.name);toast('Document created. Save or share it now.');
}
function canvasBlob(canvas,type='image/jpeg',quality=.85){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image conversion failed')),type,quality))}
async function imageCanvas(file,filter='color',rotation=0){
 const url=URL.createObjectURL(file);let img;
 try{img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(Error('Unsupported image'));el.src=url})}finally{URL.revokeObjectURL(url)}
 const max=2100,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale);
 const canvas=document.createElement('canvas');const side=rotation%180!==0;canvas.width=side?h:w;canvas.height=side?w:h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.filter=filter==='enhance'?'contrast(1.18) brightness(1.08) saturate(.85)':filter==='gray'?'grayscale(1) contrast(1.14)':filter==='bw'?'grayscale(1) contrast(1.7) brightness(1.2)':'none';ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
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
 return $PLACEHOLDER__;
}

async function imagesToPdf(filter){
 const pdf=await PDFDocument.create();for(let i=0;i<files.length;i++){
  progress(`Preparing image ${i+1} / ${files.length}`);
  const canvas=await imageCanvas(files[i],filter,scanRotations[i]||0),blob=await canvasBlob(canvas,'image/jpeg',Number(setting('quality')||.75));
  const image=await pdf.embedJpg(await blob.arrayBuffer());const pw=595.28,ph=841.89,margin=18;
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
