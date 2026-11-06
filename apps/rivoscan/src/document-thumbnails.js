// Lazily requested, bounded real thumbnails. No PDFs/base64 source files in the UI.
export function supportsThumbnail(doc){
 const name=String(doc?.name||'').toLowerCase();
 const mime=String(doc?.mimeType||'').toLowerCase();
 return !!doc?.uri && (mime==='application/pdf'||mime.startsWith('image/')
   ||/\.(pdf|jpe?g|png|webp|heic)$/.test(name));
}
export function createDocumentThumbnailService(nativeGet,{maxCached=64,concurrency=2}={}){
 if(typeof nativeGet!=='function')throw Error('getThumbnail bridge is required');
 const cache=new Map(),queue=[];
 let active=0;
 function pump(){
  while(active<concurrency&&queue.length){
   const item=queue.shift();active++;
   Promise.resolve().then(()=>nativeGet({uri:item.doc.uri}))
    .then(result=>{
     const b64=result?.base64;
     item.resolve(typeof b64==='string'&&b64.length>16
       ?'data:image/jpeg;base64,'+b64:null);
    }).catch(()=>item.resolve(null))
    .finally(()=>{active--;pump();});
  }
 }
 function get(doc){
  if(!supportsThumbnail(doc))return Promise.resolve(null);
  const key=doc.uri+'|'+(Number(doc.size)||0)+'|'+(Number(doc.created)||0);
  if(cache.has(key))return cache.get(key);
  const result=new Promise(resolve=>{queue.push({doc,resolve});pump();});
  cache.set(key,result);
  // The UI never keeps full documents; bound the number of cached small previews.
  while(cache.size>maxCached)cache.delete(cache.keys().next().value);
  return result;
 }
 function clear(){cache.clear();}
 return {get,clear};
}
