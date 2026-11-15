/* Persistent, text-only scanner journal. QR and linear/2D barcodes are
   appended to separate DAILY TXT files. No XLSX is ever generated here.
   Native appendScannerText() atomically appends to the public RivoScan folder
   and ignores identical retries, so we never overwrite previous scans. */
const CONFIG=Object.freeze({
 codes:{storage:'rivo-scan-ledger-codes-v1',columns:['Date & Time','Format','Code']},
 plates:{storage:'rivo-scan-ledger-plates-v1',text:'RivoScan_Plates.txt',columns:['Date & Time','Plate Number','Match','Photo']}
});
export const scannerLogNames=Object.freeze({
 codes:{qr:'RS_QR_',barcode:'RS_Bar_'},
 plates:{text:'RivoScan_Plates.txt'}
});
const MAX_RECORDS=12000,MAX_VALUE_LENGTH=2048;
const clean=v=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
const pad=n=>String(n).padStart(2,'0');
export function scannerLocalDay(date){
 const d=new Date(date);
 if(!Number.isFinite(d.getTime()))throw Error('Invalid scan date');
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
export function scannerLocalTimestamp(date){
 const d=new Date(date);
 return scannerLocalDay(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())+'.'+String(d.getMilliseconds()).padStart(3,'0');
}
export function scannerCodeType(format){
 return String(format||'').toUpperCase()==='QR'||String(format||'').toUpperCase()==='QR_CODE'?'QR':'Barcode';
}
export function scannerDailyFile(format,day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day)))throw Error('Invalid scanner log date');
 return 'RS_'+(scannerCodeType(format)==='QR'?'QR':'Bar')+'_'+String(day).replaceAll('-','')+'.txt';
}
const toBase64=bytes=>{
 let result='';
 for(let start=0;start<bytes.length;start+=16384)result+=String.fromCharCode(...bytes.subarray(start,start+16384));
 return btoa(result);
};
export function createScanLedger({bridge=null,storage=globalThis.localStorage,clock=()=>new Date()}={}){
 let chain=Promise.resolve();
 function read(kind){
  const config=CONFIG[kind];
  if(!config)throw Error('Unknown scanner log');
  const parsed=JSON.parse(storage.getItem(config.storage)||'[]');
  if(!Array.isArray(parsed))throw Error('Scanner history is invalid; no records overwritten');
  return parsed;
 }
 function persist(kind,rows){storage.setItem(CONFIG[kind].storage,JSON.stringify(rows));}
 function codeLine(row){
  const time=row.localAt||scannerLocalTimestamp(new Date(row.at));
  return time+'\t'+clean(row.type||'QR')+'\t'+clean(row.value);
 }
 async function sendCode(row){
  if(!bridge?.appendScannerText)throw Error('Native QR/barcode TXT append unavailable. Update the Android app.');
  const day=row.day||scannerLocalDay(new Date(row.at));
  return bridge.appendScannerText({
   name:scannerDailyFile(row.type,day),
   mimeType:'text/plain',
   line:codeLine(row)
  });
 }
 async function syncPlates(rows){
  if(!bridge?.upsertScannerLog)throw Error('Native TXT file storage unavailable');
  const table=[CONFIG.plates.columns,...rows.map(row=>[
   row.at,clean(row.plate),row.match?'YES':'NO',clean(row.photo)
  ])];
  const text=table.map(row=>row.map(clean).join('\t')).join('\n')+'\n';
  return bridge.upsertScannerLog({name:CONFIG.plates.text,mimeType:'text/plain',
   base64:toBase64(new TextEncoder().encode(text))});
 }
 async function appendRecord(kind,fields){
  const config=CONFIG[kind];
  if(!config)throw Error('Unknown scanner log');
  const value=clean(fields.value);
  if(!value||value.length>MAX_VALUE_LENGTH)throw Error('Invalid scan value');
  const rows=read(kind);
  const date=new Date(clock());
  // One entry per format+value per local day. A continuous camera view,
  // reopened scanner, and a resumed application must not duplicate a code.
  // Preserve the original timestamp and never overwrite previous TXT rows.
  if(kind==='codes'){
   const day=scannerLocalDay(date),format=clean(fields.format||'QR');
   const prior=rows.find(row=>row.day===day&&clean(row.type)===format&&clean(row.value)===value);
   if(prior){
    if(prior.exported!==true){
     try{await sendCode(prior);prior.exported=true;persist(kind,rows);}
     catch(error){return {saved:false,alreadySaved:true,duplicate:true,record:prior,reason:String(error?.message||error)};}
    }
    return {saved:false,alreadySaved:true,duplicate:true,record:prior,name:scannerDailyFile(prior.type,prior.day)};
   }
  }
  if(rows.length>=MAX_RECORDS)throw Error('Scanner log is full. Archive the records before scanning more.');
  const record=kind==='codes'
   ?{at:date.toISOString(),day:scannerLocalDay(date),localAt:scannerLocalTimestamp(date),
     type:clean(fields.format||'QR'),value,exported:false}
   :{at:date.toISOString(),plate:value,match:fields.match===true,photo:clean(fields.photoName||'')};
  // Save to a durable journal before the native write; failed exports remain queued.
  rows.push(record);persist(kind,rows);
  if(kind==='codes'){
   try{
    await sendCode(record);
    record.exported=true;persist(kind,rows);
    return {record,saved:true,name:scannerDailyFile(record.type,record.day)};
   }catch(error){return {record,saved:false,reason:String(error?.message||error)};}
  }
  try{await syncPlates(rows);return {record,saved:true,name:config.text};}
  catch(error){return {record,saved:false,reason:String(error?.message||error)};}
 }
 async function syncPending(kind){
  const rows=read(kind);
  if(!rows.length)return {saved:false,count:0};
  if(kind==='plates'){
   await syncPlates(rows);
   return {saved:true,count:rows.length};
  }
  let count=0;
  for(const row of rows){
   if(row.exported===true)continue;
   await sendCode(row);
   row.exported=true;
   persist(kind,rows);
   count++;
  }
  return {saved:true,count};
 }
 return {
  read,
  append(kind,fields){
   const result=chain.catch(()=>{}).then(()=>appendRecord(kind,fields));
   chain=result.then(()=>{},()=>{});
   return result;
  },
  resync(kind){
   const result=chain.catch(()=>{}).then(()=>syncPending(kind));
   chain=result.then(()=>{},()=>{});
   return result;
  }
 };
}
