/**
 * Search and filter locally saved scans consistently across Home and Documents.
 * Locale-independent folding covers common Latin accents; Arabic diacritics and
 * tatweel are ignored for search, but original names are never modified.
 */
export function normalizeDocumentSearch(value){
 return String(value??'').normalize('NFKD')
  .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g,'')
  .replace(/[\u0622\u0623\u0625\u0671]/g,'ا')
  .replace(/\u0649/g,'ي')
  .replace(/\u0624/g,'و')
  .replace(/\u0626/g,'ي')
  // Arabic-Indic and Eastern Arabic-Indic invoice numbers match ASCII digits.
  .replace(/[\u0660-\u0669\u06f0-\u06f9]/g,d=>String(d.charCodeAt(0)-(d.charCodeAt(0)<=0x0669?0x0660:0x06f0)))
  .replace(/[\p{P}\p{S}_]+/gu,' ')
  .toLocaleLowerCase().replace(/\s+/g,' ').trim();
}
export function documentKind(item){
 const name=String(item?.name||'').toLowerCase();
 const mime=String(item?.mimeType||'').split(';',1)[0].trim().toLowerCase();
 if(mime==='application/pdf'||name.endsWith('.pdf'))return 'pdf';
 if(mime.startsWith('image/')||/\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/.test(name))return 'images';
 return 'other';
}
export function matchesDocument(item,{query='',filter='all'}={}){
 if(!item)return false;
 if(filter!=='all'&&documentKind(item)!==filter)return false;
 const needle=normalizeDocumentSearch(query);
 if(!needle)return true;
 const haystack=normalizeDocumentSearch(item.name);
 // All words must occur, regardless of order; punctuation in saved filenames
 // is treated as a separator. Search remains fully local and read-only.
 // Numeric-only terms (invoice numbers, years) must match complete tokens:
 // a query for 123 must not accidentally return invoice 1234.
 const tokens=haystack.split(' ');
 return needle.split(' ').every(word=>/^\d+$/.test(word)?tokens.includes(word):haystack.includes(word));
}
