import {createOCRWorkbook} from './xlsx-export.js';

const CONFIG=Object.freeze({
 codes:{storage:'rivo-scan-ledger-codes-v1',text:'RivoScan_Scans.txt',excel:'RivoScan_Scans.xlsx',columns:['Date & Time','Type','Value']},
 plates:{storage:'rivo-scan-ledger-plates-v1',text:'RivoScan_Plates.txt',excel:'RivoScan_Plates.xlsx',columns:['Date & Time','Plate Number','Match','Photo']}
});
export const scannerLogNames=Object.freeze(Object.fromEntries(Object.entries(CONFIG).map(([k,v])=>[k,{text:v.text,excel:v.excel}])));
const MAX_RECORDS=12000,MAX_VALUE_LENGTH=2048;
const clean=v=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
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
 async function appendRecord(kind,fields){
  const config=CONFIG[kind];
  if(!config)throw Error('Unknown scanner log');
  const value=clean(fields.value);
  if(!value||value.length>MAX_VALUE_LENGTH)throw Error('Invalid scan value');
  const rows=read(kind);
  if(rows.length>=MAX_RECORDS)throw Error('Scanner log is full. Export and archive it before scanning more.');
  const when=clock().toISOString();
  const record=kind==='codes'
   ?{at:when,type:clean(fields.format||'QR'),value}
   :{at:when,plate:value,match:fields.match===true,photo:clean(fields.photoName||'')};
  rows.push(record);
  // Authoritative recovery journal is committed before file export. Failures stay queued.
  storage.setItem(config.storage,JSON.stringify(rows));
  const table=[config.columns,...rows.map(row=>kind==='codes'
    ?[row.at,row.type,row.value]:[row.at,row.plate,row.match?'YES':'NO',row.photo])];
  const text=table.map(row=>row.map(clean).join('\t')).join('\n')+'\n';
  const xlsx=await createOCRWorkbook({pages:[{name:kind==='codes'?'Scanned codes':'Vehicle plates',rows:table}]});
  if(!bridge||typeof bridge.upsertScannerLog!=='function')
   return {record,saved:false,reason:'Native scanner file storage unavailable'};
  const files=[
   {name:config.text,mimeType:'text/plain',bytes:new TextEncoder().encode(text)},
   {name:config.excel,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',bytes:xlsx}
  ];
  for(const file of files){
   await bridge.upsertScannerLog({name:file.name,mimeType:file.mimeType,base64:toBase64(file.bytes)});
  }
  return {record,saved:true};
 }
 return {
  read,
  append(kind,fields){
   const result=chain.catch(()=>{}).then(()=>appendRecord(kind,fields));
   chain=result.then(()=>{},()=>{});
   return result;
  },
  async resync(kind){
   const config=CONFIG[kind];
   if(!config)throw Error('Unknown scanner log');
   const rows=read(kind);
   if(!rows.length)return {saved:false,count:0};
   const table=[config.columns,...rows.map(row=>kind==='codes'
    ?[row.at,row.type,row.value]:[row.at,row.plate,row.match?'YES':'NO',row.photo])];
   if(!bridge?.upsertScannerLog)throw Error('Native scanner file storage unavailable');
   const text=new TextEncoder().encode(table.map(row=>row.map(clean).join('\t')).join('\n')+'\n');
   const xlsx=await createOCRWorkbook({pages:[{name:kind==='codes'?'Scanned codes':'Vehicle plates',rows:table}]});
   await bridge.upsertScannerLog({name:config.text,mimeType:'text/plain',base64:toBase64(text)});
   await bridge.upsertScannerLog({name:config.excel,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:toBase64(xlsx)});
   return {saved:true,count:rows.length};
  }
 };
}
