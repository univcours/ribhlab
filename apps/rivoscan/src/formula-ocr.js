import Tesseract from 'tesseract.js';
const {recognize}=Tesseract;

/**
 * Conservative conversion of LINEAR OCR math to editable TeX. Does not
 * invent fractions, superscript structure, radicals, or missing symbols.
 * Complex 2D equation recognition needs a specialized model and is not
 * claimed here.
 */
export function linearMathToLatex(text){
 const v=String(text??'').trim().slice(0,5000);
 return v.replace(/\\/g,'\\backslash ')
  .replace(/≤/g,'\\leq ').replace(/≥/g,'\\geq ')
  .replace(/≠/g,'\\neq ').replace(/×/g,'\\times ')
  .replace(/÷/g,'\\div ').replace(/±/g,'\\pm ')
  .replace(/∞/g,'\\infty ').replace(/π/g,'\\pi ')
  .replace(/θ/g,'\\theta ').replace(/α/g,'\\alpha ')
  .replace(/β/g,'\\beta ').replace(/∑/g,'\\sum ')
  .replace(/√\s*\(([^()]+)\)/g,'\\sqrt{$1}')
  .replace(/([A-Za-z0-9])\^([A-Za-z0-9]+)/g,'$1^{$2}')
  .replace(/([A-Za-z0-9])_([A-Za-z0-9]+)/g,'$1_{$2}');
}
const translations={
 en:['Formula OCR (linear · beta)','Take formula photo','Import image','Read equation','Editable OCR text','Copy LaTeX','Save text + TeX','Close','This recognizes visible linear math characters with OCR; it does NOT reconstruct complex stacked fractions, handwritten derivations or mathematical meaning. Verify every symbol.','No equation was recognized.','Local OCR language files may download on first use.'],
 ar:['قراءة المعادلات (تجريبية)','تصوير معادلة','استيراد صورة','قراءة المعادلة','الكتابة المقروءة قابلة للتصحيح','نسخ LaTeX','حفظ النص وLaTeX','إغلاق','كيقرأ رموز المعادلات الخطية بـOCR؛ الكسور المركبة والكتابة اليدوية والمعنى الرياضي ما كيرجعهمش بدقة. راجع كل رمز.','ما تعرفناش على معادلة.','ملفات OCR ممكن تتحمّل أول مرة.'],
 fr:['OCR des formules linéaires (bêta)','Photographier','Importer image','Lire la formule','Texte OCR modifiable','Copier LaTeX','Enregistrer texte et TeX','Fermer','OCR de symboles en ligne. Ne reconstruit pas les fractions empilées ni la géométrie des expressions. Vérifiez les signes.','Aucune formule reconnue.','Données OCR téléchargées au premier usage.'],
 es:['OCR de fórmulas lineales (beta)','Fotografiar','Importar imagen','Leer fórmula','Texto OCR editable','Copiar LaTeX','Guardar texto y TeX','Cerrar','Solo OCR lineal; no reconstruye fracciones complejas. Verifica símbolos.','Sin fórmula.','Datos OCR descargados al primer uso.'],
 de:['Lineare Formel OCR (Beta)','Foto aufnehmen','Bild importieren','Formel lesen','Editierbarer OCR-Text','LaTeX kopieren','Text + TeX speichern','Schließen','Nur lineare Texterkennung; komplexe Brüche werden nicht rekonstruiert. Zeichen prüfen.','Keine Formel erkannt.','OCR-Sprachdaten beim ersten Mal laden.'],
 pt:['OCR de fórmulas lineares (beta)','Fotografar','Importar imagem','Ler fórmula','Texto OCR editável','Copiar LaTeX','Guardar texto e TeX','Fechar','OCR linear, não reconstrói frações complexas. Verifique símbolos.','Sem fórmula.','Dados OCR descarregados no primeiro uso.'],
 it:['OCR formule lineari (beta)','Fotografa','Importa immagine','Leggi formula','Testo OCR modificabile','Copia LaTeX','Salva testo e TeX','Chiudi','OCR lineare, non ricrea frazioni complesse. Verifica i simboli.','Nessuna formula.','Dati OCR scaricati al primo uso.']
};
export function openFormulaReader({language='en',capture,save,notify=()=>{}}={}){
 const L=translations[language]||translations.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay';
 const panel=document.createElement('section');panel.className='rivo-code-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const actions=document.createElement('div');actions.className='rivo-code-actions';panel.append(actions);
 const file=document.createElement('input');file.type='file';file.accept='image/*';file.hidden=true;panel.append(file);
 const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
 const original=document.createElement('textarea');original.rows=5;original.placeholder=L[4];
 const latex=document.createElement('textarea');latex.rows=5;latex.placeholder='LaTeX';latex.dir='ltr';
 for(const [name,control] of [[L[4],original],['LaTeX (editable)',latex]]){
  const label=document.createElement('label');label.className='rivo-id-row';label.textContent=name;label.append(control);panel.append(label);
 }
 const notice=document.createElement('p');notice.className='rivo-code-help';notice.textContent=L[8]+' '+L[10];panel.append(notice);
 const buttons=document.createElement('div');buttons.className='rivo-code-actions';panel.append(buttons);
 let selected=null,closed=false,busy=false;
 const action=(container,text,cb)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',cb);container.append(b)};
 const close=()=>{if(busy)return;closed=true;selected=null;overlay.remove()};
 action(actions,L[1],async()=>{
  if(!capture||busy)return;
  try{
   const uri=await capture();if(!uri)return;
   const response=await fetch(uri);if(!response.ok)throw Error('Cannot read photo');
   selected=new File([await response.blob()],'RivoScan_Formula.jpg',{type:'image/jpeg'});
   status.textContent=selected.name;
  }catch(error){status.textContent=error?.message||String(error)}
 });
 action(actions,L[2],()=>file.click());
 file.addEventListener('change',()=>{if(file.files?.[0])selected=file.files[0];status.textContent=selected?.name||'';file.value=''});
 action(buttons,L[3],async()=>{
  if(!selected||busy)return;
  busy=true;status.textContent=L[3]+' …';
  try{
   if(selected.size>16*1024*1024)throw Error('Image limit: 16 MB');
   const result=await recognize(selected,'eng');
   if(closed)return;
   original.value=(result.data.text||'').trim().slice(0,5000);
   latex.value=linearMathToLatex(original.value);
   const confidence=Math.round(result.data.confidence||0);
   status.textContent=original.value?'OCR '+confidence+'% · '+L[8]:L[9];
  }catch(error){if(!closed)status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 original.addEventListener('input',()=>{latex.value=linearMathToLatex(original.value)});
 action(buttons,L[5],async()=>{
  if(!latex.value)return;
  try{await navigator.clipboard.writeText(latex.value);notify('LaTeX ✓')}
  catch{status.textContent=latex.value}
 });
 action(buttons,L[6],async()=>{
  if(!latex.value||busy)return;busy=true;
  try{
   const data='OCR:\n'+original.value+'\n\nLaTeX:\n'+latex.value;
   await save(new TextEncoder().encode(data),'RivoScan_Formula_'+Date.now()+'.txt','text/plain');
   if(!closed)notify(L[6]+' ✓');
  }catch(error){if(!closed)status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 action(buttons,L[7],close);
 overlay.append(panel);document.body.append(overlay);return close;
}
