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
export async function createOCRWorkbook(rows){
 if(!Array.isArray(rows)||rows.length===0)throw Error('No extracted text to export');
 if(rows.length>50000)throw Error('Excel export limit: 50,000 OCR lines');
 const zip=new JSZip();
 const safeRows=rows.map(line=>Array.isArray(line)?line:[line]);
 const maxColumns=Math.max(1,...safeRows.map(line=>line.length));
 if(maxColumns>256)throw Error('Too many OCR columns');
 let xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<dimension ref="A1:'+excelColumnName(maxColumns-1)+safeRows.length+'"/><sheetData>';
 for(let r=0;r<safeRows.length;r++){
  xml+='<row r="'+(r+1)+'">';
  for(let c=0;c<safeRows[r].length;c++){
   const value=String(safeRows[r][c]??'').slice(0,32767);
   if(!value)continue;
   // Inline text prevents OCR-injected formulas and preserves numbers with leading zeros.
   xml+='<c r="'+excelColumnName(c)+(r+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEscape(value)+'</t></is></c>';
  }
  xml+='</row>';
 }
 xml+='</sheetData></worksheet>';
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
  '<Default Extension="xml" ContentType="application/xml"/>'+
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
  '</Types>');
 zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
  '</Relationships>');
 zip.folder('xl').file('workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
  '<sheets><sheet name="RivoScan OCR" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.folder('xl').folder('_rels').file('workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'+
  '</Relationships>');
 zip.folder('xl').folder('worksheets').file('sheet1.xml',xml);
 return new Uint8Array(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}));
}
