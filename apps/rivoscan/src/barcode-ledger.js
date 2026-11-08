import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {createOCRWorkbook} from './xlsx-export.js';

export const CODE_LEDGER_FILENAME='RivoScan_Scanned_Codes.xlsx';
export const CODE_LEDGER_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PRIVATE_PATH='RivoScan/scanned-code-records.json';
const WEB_KEY='rivoscan-code-records-v1';
// One header + 49,999 codes stays inside the existing 50,000-row XLSX writer.
const MAX_RECORDS=49999;
const android=()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';

export function validateScannedCode(value,format='UNKNOWN',scannedAt=new Date().toISOString()){
  // A barcode is *text*, including leading zeroes or formula-looking contents.
  // Preserve the original characters, but bound the workbook's memory usage.
  const code=String(value??'');
  if(!code.trim()||code.length>2048)throw Error('Invalid or excessively long code.');
  const kind=String(format||'UNKNOWN').slice(0,80);
  const when=new Date(scannedAt);
  if(Number.isNaN(when.valueOf()))throw Error('Invalid scan date.');
  return {code,format:kind,scannedAt:when.toISOString()};
}

function decodeStored(raw){
  let json;
  try{json=JSON.parse(raw);}catch{throw Error('Saved code database is unreadable. No data was overwritten.');}
  if(!json||json.version!==1||!Array.isArray(json.records))
    throw Error('Unknown scan database format. No data was overwritten.');
  if(json.records.length>MAX_RECORDS)throw Error('Saved code database exceeds the Excel limit.');
  return json.records.map(row=>validateScannedCode(row.code,row.format,row.scannedAt));
}
async function readRecords(){
  if(android()){
    try{
      const file=await Filesystem.readFile({path:PRIVATE_PATH,directory:Directory.Data,encoding:Encoding.UTF8});
      if(typeof file.data!=='string')throw Error('Saved code database is not text.');
      return decodeStored(file.data);
    }catch(error){
      if(/(?:not found|does not exist|ENOENT|no such file)/i.test(String(error?.message||error)))return [];
      throw error;
    }
  }
  const raw=localStorage.getItem(WEB_KEY);
  return raw===null?[]:decodeStored(raw);
}
async function writeRecords(records){
  const json=JSON.stringify({version:1,records});
  if(android())await Filesystem.writeFile({
    path:PRIVATE_PATH,directory:Directory.Data,encoding:Encoding.UTF8,
    data:json,recursive:true
  });
  else localStorage.setItem(WEB_KEY,json);
}
const b64=bytes=>{
  let raw='';
  for(let i=0;i<bytes.length;i+=16384)
    raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(raw);
};
async function workbook(records){
  return createOCRWorkbook({pages:[{name:'Scanned Codes',rows:[
    ['Code','Type','Scanned At (UTC ISO 8601)'],
    ...records.map(item=>[item.code,item.format,item.scannedAt])
  ]}]});
}
function download(bytes){
  const url=URL.createObjectURL(new Blob([bytes],{type:CODE_LEDGER_MIME}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=CODE_LEDGER_FILENAME;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
/** A single serialized queue prevents overlapping reads and workbook overwrites. */
export function createCodeLedger({bridge}={}){
  let tail=Promise.resolve();
  const sequence=fn=>{
    const step=tail.then(fn,fn);
    tail=step.catch(()=>{});
    return step;
  };
  const saveWorkbook=async records=>{
    if(!records.length)return null;
    const bytes=await workbook(records);
    if(android()){
      if(!Capacitor.isPluginAvailable('RivoDocuments')||!bridge?.upsertCodeLedger)
        throw Error('RivoScan Android Excel storage is unavailable.');
      return bridge.upsertCodeLedger({base64:b64(bytes)});
    }
    // Browser: the Excel is exported only when requested, not downloaded on
    // every camera frame. Private local browser history is still retained.
    return {name:CODE_LEDGER_FILENAME,webOnly:true};
  };
  return {
    list:()=>sequence(()=>readRecords()),
    append:(value,format,at)=>sequence(async()=>{
      const entry=validateScannedCode(value,format,at);
      const records=await readRecords();
      if(records.length>=MAX_RECORDS)
        throw Error('Excel code database is full. Export a copy before clearing.');
      const updated=[...records,entry];
      // Durable private record first; if Excel fails, next sync can recover.
      await writeRecords(updated);
      try{
        await saveWorkbook(updated);
        return {record:entry,total:updated.length,synced:true};
      }catch(error){
        return {record:entry,total:updated.length,synced:false,error:String(error?.message||error)};
      }
    }),
    export:()=>sequence(async()=>{
      const records=await readRecords();
      if(!records.length)return {empty:true,total:0};
      const bytes=await workbook(records);
      if(android()){
        if(!Capacitor.isPluginAvailable('RivoDocuments')||!bridge?.upsertCodeLedger)
          throw Error('RivoScan Android Excel storage is unavailable.');
        await bridge.upsertCodeLedger({base64:b64(bytes)});
      }else download(bytes);
      return {empty:false,total:records.length,name:CODE_LEDGER_FILENAME};
    }),
    clear:()=>sequence(async()=>{
      const previous=await readRecords();
      if(!previous.length)return {cleared:0};
      await writeRecords([]);
      try{
        if(android()){
          if(!bridge?.clearCodeLedger)throw Error('Android Excel storage is unavailable.');
          await bridge.clearCodeLedger();
        }
      }catch(error){
        // Failed to delete public XLSX? Restore private canonical records so
        // next sync does not quietly lose the user's scanned history.
        await writeRecords(previous);
        throw error;
      }
      return {cleared:previous.length};
    })
  };
}
