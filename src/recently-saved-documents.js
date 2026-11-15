/** Keep just-committed Android documents visible while MediaStore indexes them.
 * Strictly cosmetic: the native save MUST have succeeded first. Never hold
 * unsaved drafts or replace files in durable storage.
 */
export function createRecentlySavedDocuments({clock=()=>Date.now(),ttlMs=45000,maxPending=32}={}){
 const pending=new Map();
 const normalized=(saved,when)=>{
  if(!saved||typeof saved.uri!=='string'||!/^content:\/\/[^/]+\/.+/.test(saved.uri)
     ||typeof saved.name!=='string'||!saved.name.trim())return null;
  return {uri:saved.uri,name:saved.name.trim(),mimeType:saved.mimeType||'application/pdf',
   size:Math.max(0,Number(saved.size)||0),created:when,folder:saved.folder||'Documents/RivoScan/'};
 };
 function remember(saved){
  const entry=normalized(saved,clock());
  if(!entry)return false;
  if(pending.has(entry.uri))pending.delete(entry.uri);
  pending.set(entry.uri,entry);
  while(pending.size>maxPending)pending.delete(pending.keys().next().value);
  return true;
 }
 function merge(nativeFiles){
  const list=Array.isArray(nativeFiles)?[...nativeFiles]:[];
  const existing=new Set(list.map(item=>String(item?.uri||'')));
  const time=clock();
  for(const [uri,item]of pending){
   // If MediaStore exposes the same file through its canonical URI,
   // stop tracking it. It is now present on its own.
   if(existing.has(uri)){pending.delete(uri);continue;}
   if(time-item.created>ttlMs){pending.delete(uri);continue;}
   list.unshift({...item});
   existing.add(uri);
  }
  return list.sort((a,b)=>(b?.created||0)-(a?.created||0));
 }
 return {remember,merge,pendingCount:()=>pending.size};
}
