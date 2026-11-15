/** Short, date-bearing names for NEW RivoScan exports.
 * Existing documents, user-imported files, and daily QR/Barcode journals are
 * never renamed. Milliseconds + a same-tick counter avoid name collisions.
 */
const pad=(value,len=2)=>String(value).padStart(len,'0');
export function rsDay(date=new Date()){
 const d=new Date(date);
 if(!Number.isFinite(d.getTime()))throw new TypeError('Invalid file date');
 return String(d.getFullYear())+pad(d.getMonth()+1)+pad(d.getDate());
}
export function rsTimestamp(date=new Date()){
 const d=new Date(date);
 if(!Number.isFinite(d.getTime()))throw new TypeError('Invalid file date');
 return rsDay(d)+'_'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds())+'_'+pad(d.getMilliseconds(),3);
}
function extensionOf(filename,mime){
 const name=String(filename||'');
 const fromName=name.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1]?.toLowerCase();
 if(fromName)return fromName==='jpeg'?'jpg':fromName;
 const types={'application/pdf':'pdf','text/plain':'txt','image/jpeg':'jpg',
  'image/png':'png','application/zip':'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx'};
 return types[mime]||'bin';
}
export function rsFileKind(filename,mime){
 const original=String(filename||'').toLowerCase();
 const ext=extensionOf(filename,mime);
 if(/ocr|extract[_ -]?text|recognized/.test(original))return 'OCR';
 if(/\.txt$/i.test(original)||ext==='txt')return 'TXT';
 if(['jpg','png','webp','heic','gif'].includes(ext))return 'Img';
 if(ext==='pdf')return 'Doc';
 if(['xlsx','xls','csv','ods'].includes(ext))return 'Xls';
 if(['docx','doc','odt','rtf'].includes(ext))return 'Word';
 if(['pptx','ppt'].includes(ext))return 'Slides';
 if(['zip','rar','7z'].includes(ext))return 'Zip';
 return 'File';
}
export function createRsFileNamer({clock=()=>new Date()}={}){
 let previous='',collision=0;
 return function nextName(filename='',mime=''){
  const raw=String(filename||'');
  // A caller can deliberately provide a preformatted RS document name.
  if(/^RS_(?:Doc|Img|OCR|TXT|Xls|Word|Slides|Zip|File)_\d{8}_\d{6}_\d{3}(?:_\d+)?\.[a-z0-9]{1,5}$/i.test(raw))return raw;
  const date=new Date(clock());
  const stamp=rsTimestamp(date);
  if(stamp===previous)collision++;else{previous=stamp;collision=0;}
  const suffix=collision?'_'+collision:'';
  return 'RS_'+rsFileKind(raw,mime)+'_'+stamp+suffix+'.'+extensionOf(raw,mime);
 };
}
export const generatedRsName=createRsFileNamer();
