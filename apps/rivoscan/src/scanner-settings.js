// Persistent, versioned scanner preferences used by both web UI and CameraX.
// Strict normalization protects native Android extras from malformed storage.
export const SCAN_PREF_KEY='rivo-scanner-preferences-v1';
export const DEFAULT_SCAN_PREFS=Object.freeze({
  batch:false,
  cameraQuality:'hd',
  enhancement:'auto',
  autoClean:true,
  keepOriginal:true,
  jpegQuality:94,
  pdfQuality:0.85,
  pageSize:'a4',
  autoSavePdf:true
});
const choices={
 cameraQuality:['hd','sd'],
 enhancement:['auto','enhance','magic','shadow','whiteboard','bw','original'],
 jpegQuality:[78,88,94],
 pdfQuality:[0.65,0.85,0.95],
 pageSize:['a4','letter'],
};
const boolKeys=new Set(['batch','autoClean','keepOriginal','autoSavePdf']);
export function normalizeScanPrefs(value={}){
 const prefs={...DEFAULT_SCAN_PREFS};
 if(!value||typeof value!=='object'||Array.isArray(value))return prefs;
 for(const key of Object.keys(DEFAULT_SCAN_PREFS)){
  if(boolKeys.has(key)){if(typeof value[key]==='boolean')prefs[key]=value[key];}
  else if(choices[key]?.includes(value[key]))prefs[key]=value[key];
 }
 return prefs;
}
export function readScanPrefs(store){
 try{return normalizeScanPrefs(JSON.parse(store?.getItem(SCAN_PREF_KEY)||'{}'))}
 catch{return normalizeScanPrefs()}
}
export function updateScanPref(store,key,value){
 if(!Object.hasOwn(DEFAULT_SCAN_PREFS,key))throw Error('Unknown scanner setting');
 const candidate=normalizeScanPrefs({...readScanPrefs(store),[key]:value});
 // Never persist an unsupported value.
 if(candidate[key]!==value)throw Error('Unsupported scanner setting value');
 store?.setItem(SCAN_PREF_KEY,JSON.stringify(candidate));
 return candidate;
}
const TEXT={
 en:{title:'Scanner preferences',sub:'Camera and PDF quality',autoClean:'Auto-clean when tapping ✓',autoCleanHelp:'Straighten, remove uneven shadows and clarify text and colored stamps',enhancement:'Default cleanup preset',keepOriginal:'Keep unedited original',keepOriginalHelp:'Copies go to Documents/RivoScan/Originals',batch:'Multi-page camera by default',cameraQuality:'Camera capture quality',jpegQuality:'Saved page JPG quality',pdfQuality:'PDF image quality',pageSize:'PDF page size',autoSavePdf:'Automatically create PDF after scanning',autoSavePdfHelp:'Turn off to review or reorder the captured pages first',folder:'Scans: Documents/RivoScan',fallback:'The unedited photograph is always available when original backup is enabled',settingsSaved:'Scanner preference saved',modes:{auto:'Auto Clean (recommended)',enhance:'Enhance',magic:'Magic strong contrast',shadow:'Remove shadows',whiteboard:'Whiteboard',bw:'Black & white',original:'Original / no enhancement'}, values:{hd:'HD / maximum',sd:'SD / quick',a4:'A4',letter:'US Letter'}},
 ar:{title:'إعدادات السكانير',sub:'الكاميرا وجودة PDF',autoClean:'تنقية تلقائية مع ✓',autoCleanHelp:'تصحيح الحواف وتخفيف الظلال وإظهار الكتابة والكاشيات',enhancement:'نوع التنقية الافتراضي',keepOriginal:'احتافظ بالصورة الأصلية',keepOriginalHelp:'فالملف Documents/RivoScan/Originals',batch:'تصوير عدة صفحات افتراضياً',cameraQuality:'جودة التصوير',jpegQuality:'جودة صور JPG المحفوظة',pdfQuality:'جودة صور PDF',pageSize:'حجم صفحة PDF',autoSavePdf:'إنشاء PDF تلقائياً بعد التصوير',autoSavePdfHelp:'طفيها باش تراجع وترتّب الصفحات قبل الحفظ',folder:'الوثائق: Documents/RivoScan',fallback:'الصورة الأصلية كتبقى محفوظة ملي كتفعّل النسخة الأصلية',settingsSaved:'تحفظ إعداد السكانير',modes:{auto:'تنقية تلقائية (مقترحة)',enhance:'تحسين',magic:'تحسين قوي',shadow:'حذف الظلال',whiteboard:'السبورة',bw:'أبيض وأسود',original:'الصورة الأصلية بلا تحسين'},values:{hd:'HD عالية',sd:'SD سريعة',a4:'A4',letter:'Letter'}},
 fr:{title:'Réglages du scanner',sub:'Caméra et qualité PDF',autoClean:'Nettoyage auto avec ✓',autoCleanHelp:'Redresser, atténuer les ombres et renforcer textes et cachets',enhancement:'Filtre par défaut',keepOriginal:'Conserver la photo originale',keepOriginalHelp:'Dossier Documents/RivoScan/Originals',batch:'Mode multipage par défaut',cameraQuality:'Qualité de capture',jpegQuality:'Qualité JPG',pdfQuality:'Qualité PDF',pageSize:'Format PDF',autoSavePdf:'Créer un PDF automatiquement',autoSavePdfHelp:'Désactiver pour réorganiser les pages avant la sauvegarde',folder:'Documents : Documents/RivoScan',settingsSaved:'Réglage enregistré',modes:{auto:'Nettoyage auto (conseillé)',enhance:'Améliorer',magic:'Intensif',shadow:'Sans ombres',whiteboard:'Tableau blanc',bw:'Noir & blanc',original:'Original'},values:{hd:'HD maximale',sd:'SD rapide',a4:'A4',letter:'US Letter'}},
 es:{title:'Ajustes de escáner',sub:'Cámara y calidad PDF',autoClean:'Limpiar automáticamente con ✓',autoCleanHelp:'Enderezar, reducir sombras y aclarar texto y sellos',enhancement:'Filtro predeterminado',keepOriginal:'Guardar foto original',keepOriginalHelp:'Documents/RivoScan/Originals',batch:'Multipágina por defecto',cameraQuality:'Calidad de cámara',jpegQuality:'Calidad JPG',pdfQuality:'Calidad PDF',pageSize:'Tamaño PDF',autoSavePdf:'Crear PDF automáticamente',autoSavePdfHelp:'Desactiva para ordenar las páginas antes de guardar',folder:'Documents/RivoScan',settingsSaved:'Preferencia guardada',modes:{auto:'Limpieza auto',enhance:'Mejorar',magic:'Intenso',shadow:'Sin sombras',whiteboard:'Pizarra',bw:'B/N',original:'Original'},values:{hd:'HD máxima',sd:'SD rápida',a4:'A4',letter:'US Letter'}},
 de:{title:'Scanner-Einstellungen',sub:'Kamera und PDF-Qualität',autoClean:'Automatisch reinigen bei ✓',autoCleanHelp:'Perspektive, Schatten und blasse Stempel verbessern',enhancement:'Standardfilter',keepOriginal:'Originalfoto sichern',keepOriginalHelp:'Documents/RivoScan/Originals',batch:'Mehrseitig als Standard',cameraQuality:'Kameraqualität',jpegQuality:'JPG-Qualität',pdfQuality:'PDF-Qualität',pageSize:'PDF-Seitengröße',autoSavePdf:'PDF automatisch erzeugen',autoSavePdfHelp:'Deaktivieren, um Seiten vor dem Speichern zu ordnen',folder:'Documents/RivoScan',settingsSaved:'Einstellung gespeichert',modes:{auto:'Auto-Reinigung',enhance:'Verbessern',magic:'Intensiv',shadow:'Ohne Schatten',whiteboard:'Whiteboard',bw:'S/W',original:'Original'},values:{hd:'HD maximal',sd:'SD schnell',a4:'A4',letter:'US Letter'}},
 pt:{title:'Definições do scanner',sub:'Câmara e qualidade PDF',autoClean:'Limpeza automática com ✓',autoCleanHelp:'Corrigir perspetiva, sombras, texto e carimbos',enhancement:'Filtro padrão',keepOriginal:'Guardar foto original',keepOriginalHelp:'Documents/RivoScan/Originals',batch:'Multipágina por padrão',cameraQuality:'Qualidade da câmara',jpegQuality:'Qualidade JPG',pdfQuality:'Qualidade PDF',pageSize:'Tamanho PDF',autoSavePdf:'Criar PDF automaticamente',autoSavePdfHelp:'Desative para organizar páginas antes de guardar',folder:'Documents/RivoScan',settingsSaved:'Definição guardada',modes:{auto:'Limpeza auto',enhance:'Melhorar',magic:'Intenso',shadow:'Sem sombras',whiteboard:'Quadro branco',bw:'P&B',original:'Original'},values:{hd:'HD máxima',sd:'SD rápida',a4:'A4',letter:'US Letter'}},
 it:{title:'Impostazioni scanner',sub:'Fotocamera e qualità PDF',autoClean:'Pulizia automatica con ✓',autoCleanHelp:'Corregge prospettiva, ombre, testo e timbri',enhancement:'Filtro predefinito',keepOriginal:'Salva la foto originale',keepOriginalHelp:'Documents/RivoScan/Originals',batch:'Multipagina predefinito',cameraQuality:'Qualità fotocamera',jpegQuality:'Qualità JPG',pdfQuality:'Qualità PDF',pageSize:'Formato PDF',autoSavePdf:'Crea PDF automaticamente',autoSavePdfHelp:'Disattiva per riordinare le pagine prima di salvare',folder:'Documents/RivoScan',settingsSaved:'Impostazione salvata',modes:{auto:'Pulizia automatica',enhance:'Migliora',magic:'Intenso',shadow:'Senza ombre',whiteboard:'Lavagna',bw:'B/N',original:'Originale'},values:{hd:'HD massima',sd:'SD veloce',a4:'A4',letter:'US Letter'}}
};
export const scanPrefsText=lang=>TEXT[lang]||TEXT.en;
export const SCAN_PREF_FIELDS=[
 {key:'autoClean',type:'switch'},
 {key:'enhancement',type:'select',options:choices.enhancement},
 {key:'keepOriginal',type:'switch'},
 {key:'batch',type:'switch'},
 {key:'cameraQuality',type:'select',options:choices.cameraQuality},
 {key:'jpegQuality',type:'select',options:choices.jpegQuality},
 {key:'pdfQuality',type:'select',options:choices.pdfQuality},
 {key:'pageSize',type:'select',options:choices.pageSize},
 {key:'autoSavePdf',type:'switch'}
];
export function formatScanSettingValue(lang,key,value){
 const label=scanPrefsText(lang);
 if(key==='enhancement')return label.modes[value]||String(value);
 if(key==='cameraQuality'||key==='pageSize')return label.values[value]||String(value);
 if(key==='jpegQuality')return value+'%';
 if(key==='pdfQuality')return Math.round(value*100)+'%';
 return String(value);
}
