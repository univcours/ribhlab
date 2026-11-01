import JSZip from 'jszip';

/**
 * Editable spreadsheet for OCR/text lines. It does NOT infer missing table
 * borders or claim perfect row/column recognition from photographs.
 * All extracted values are inline strings: never evaluate OCR content as Excel formulas.
 */
const xmlEscape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&apos;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
export const excelColumnName=n=>{
 if(!Number.isSafeInteger(n)||n<0||n>=16384)throw Error('Excel column is out of range');
 let x=n+1,out='';
 while(x){x--;out=String.fromCharCode(65+(x%26))+out;x=Math.floor(x/26)}
 return out;
};

/**
 * Multiple PDF pages export to separate named, editable worksheets.
 * Backward compatible with createOCRWorkbook(rows).
 * OCR-derived text never becomes formulas, even when it begins with "=".
 */
export async function createOCRWorkbook(input){
 const pages=Array.isArray(input)?[{name:'RivoScan OCR',rows:input}]:input?.pages;
 if(!Array.isArray(pages)||!pages.length||pages.length>25)throw Error('Choose 1–25 Excel pages');
 const normalized=pages.map((page,i)=>{
  if(!Array.isArray(page.rows))throw Error('Invalid Excel page rows');
  const rows=page.rows.map(line=>Array.isArray(line)?line:[line]);
  const name=String(page.name||('Page '+(i+1))).split('').filter(ch=>!['[',']','*','?',':','/',String.fromCharCode(92)].includes(ch)).join('').trim().slice(0,31)||('Page '+(i+1));
  return {name,rows};
 });
 if(normalized.reduce((n,p)=>n+p.rows.length,0)>50000)throw Error('Excel export limit: 50,000 OCR lines');
 if(normalized.every(p=>p.rows.length===0))throw Error('No extracted text to export');
 const used=new Set();
 for(const p of normalized){
  const root=p.name;let name=root,i=2;
  while(used.has(name.toLowerCase())){const suffix=' '+i++;name=root.slice(0,31-suffix.length)+suffix}
  p.name=name;used.add(name.toLowerCase());
 }
 const zip=new JSZip();
 const types=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
  '<Default Extension="xml" ContentType="application/xml"/>',
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'];
 const sheetEntries=[],relations=[];
 for(let i=0;i<normalized.length;i++){
  const page=normalized[i],rows=page.rows;
  const cols=Math.max(1,...rows.map(r=>r.length));
  if(cols>256)throw Error('Too many OCR columns');
  const widths=Array.from({length:cols},()=>12);
  for(const row of rows)for(let col=0;col<row.length;col++)
   widths[col]=Math.max(widths[col],Math.min(40,String(row[col]??'').length+2));
  const limits='<cols>'+widths.map((n,j)=>'<col min="'+(j+1)+'" max="'+(j+1)+'" width="'+n+'" customWidth="1"/>').join('')+'</cols>';
  let xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<dimension ref="A1:'+excelColumnName(cols-1)+Math.max(1,rows.length)+'"/>'+limits+'<sheetData>';
  for(let r=0;r<rows.length;r++){
   xml+='<row r="'+(r+1)+'">';
   for(let col=0;col<rows[r].length;col++){
    const value=String(rows[r][col]??'').slice(0,32767);
    if(!value)continue;
    xml+='<c r="'+excelColumnName(col)+(r+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEscape(value)+'</t></is></c>';
   }
   xml+='</row>';
  }
  xml+='</sheetData></worksheet>';
  const n=i+1;
  zip.folder('xl').folder('worksheets').file('sheet'+n+'.xml',xml);
  types.push('<Override PartName="/xl/worksheets/sheet'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
  sheetEntries.push('<sheet name="'+xmlEscape(page.name)+'" sheetId="'+n+'" r:id="rId'+n+'"/>');
  relations.push('<Relationship Id="rId'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+n+'.xml"/>');
 }
 zip.file('[Content_Types].xml',types.join('')+'</Types>');
 zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
  '</Relationships>');
 zip.folder('xl').file('workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
  '<sheets>'+sheetEntries.join('')+'</sheets></workbook>');
 zip.folder('xl').folder('_rels').file('workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+relations.join('')+'</Relationships>');
 return new Uint8Array(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}));
}
