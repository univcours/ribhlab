/** Safe, Unicode-preserving names and spreadsheet exports. */
export function safeDocumentName(value,{maxLength=110,fallback='RivoScan.pdf'}={}){
 const limit=Number.isInteger(maxLength)?Math.max(8,Math.min(255,maxLength)):110;
 let name=String(value??'').normalize('NFC')
  .replace(/[\/\\:*?"<>|\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'_')
  .trim().replace(/^[.\s]+|[.\s]+$/gu,'');
 if(!name)name=fallback;
 const match=name.match(/^(.*?)(\.[A-Za-z0-9]{1,12})$/u);
 const ext=match?.[2]||'';
 const base=match?.[1]||name;
 const size=Array.from(name).length;
 if(size<=limit)return name;
 const shortBase=Array.from(base).slice(0,Math.max(1,limit-Array.from(ext).length)).join('').replace(/[.\s]+$/u,'');
 return (shortBase||'RivoScan')+ext;
}
/** CSV/TSV is opened by spreadsheet tools: force OCR/user text to plain data. */
export function spreadsheetText(value){
 const cell=String(value??'');
 return /^[\s\uFEFF]*[=+\-@]/u.test(cell)?"'"+cell:cell;
}
