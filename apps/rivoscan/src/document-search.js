/**
 * Search and filter locally saved scans consistently across Home and Documents.
 * Locale-independent folding covers common Latin accents; Arabic diacritics and
 * tatweel are ignored for search, but original names are never modified.
 */
export function normalizeDocumentSearch(value){
 return String(value??'').normalize('NFKD')
  .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g,'')
  .replace(/\u0649/g,'ي')
  .toLocaleLowerCase().trim();
}
export function documentKind(item){
 const name=String(item?.name||'').toLowerCase();
 const mime=String(item?.mimeType||'').toLowerCase();
 if(mime==='application/pdf'||name.endsWith('.pdf'))return 'pdf';
 if(mime.startsWith('image/')||/\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/.test(name))return 'images';
 return 'other';
}
export function matchesDocument(item,{query='',filter='all'}={}){
 if(!item)return false;
 if(filter!=='all'&&documentKind(item)!==filter)return false;
 const needle=normalizeDocumentSearch(query);
 return !needle||normalizeDocumentSearch(item.name).includes(needle);
}
