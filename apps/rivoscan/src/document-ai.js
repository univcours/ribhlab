import Tesseract from 'tesseract.js';
import {AI_DEFAULT_MODEL,buildAIRequest,requestUserAI} from './ai-provider.js';
const {recognize}=Tesseract;
const translations={
 en:['AI Chat with Document','Solver AI · Image / Text','Document/photo','Choose file','Your own API key (session only)','AI model','Question','Ask AI','Send for solving','Close','Extracting document locally…','Answer','This optional feature sends extracted text or the chosen problem photo to an external AI provider ONLY after you confirm. You need your own paid API key. The key and document are never saved in RivoScan. AI answers can be wrong.','Do you agree to send the selected document content and question to OpenAI using your own account? Charges may apply.','Choose a document or photo first.','A PDF is limited to 15 pages / 15 MB. A photo is limited to 5 MB.'],
 ar:['AI Chat مع الوثيقة','Solver AI · حلّ المسائل','الوثيقة أو الصورة','اختار الملف','مفتاح API ديالك (غير هاد الجلسة)','نموذج AI','السؤال','سول AI','حلّ المسألة','إغلاق','كنستخرجو نص الوثيقة محلياً…','الجواب','هاد الميزة الاختيارية كترسل النص المستخرج أو صورة المسألة لمزوّد AI خارجي غير من بعد موافقتك. خاصك مفتاح API شخصي وقد تكون تكاليف. المفتاح والوثيقة ما كيتخزنوش فـRivoScan. الأجوبة ممكن تغلط.','واش موافق ترسل محتوى الوثيقة والسؤال إلى OpenAI بحسابك؟ قد تكون تكاليف.','اختار وثيقة أو صورة أولاً.','PDF حتى 15 صفحة و15 MB، والصورة حتى 5 MB.'],
 fr:['AI Chat · Documents','Solver AI · Photo / Texte','Document ou photo','Choisir fichier','Votre clé API (session uniquement)','Modèle IA','Question','Demander à IA','Résoudre','Fermer','Extraction locale…','Réponse','Après votre confirmation, du texte ou une photo est envoyé au fournisseur AI. Une clé API personnelle payante est requise. Rien n’est enregistré dans RivoScan. La réponse peut être erronée.','Envoyer volontairement le document et la question à OpenAI ? Des frais peuvent s’appliquer.','Choisissez un fichier.','PDF : 15 pages, 15 Mo. Photo : 5 Mo.'],
 es:['AI Chat · Documentos','Solver AI · Problemas','Documento o foto','Elegir archivo','Clave API (solo sesión)','Modelo AI','Pregunta','Preguntar','Resolver','Cerrar','Extracción local…','Respuesta','Se envía texto o imagen al proveedor externo solo con permiso. Necesitas tu clave API de pago, no se guarda. Resultados pueden ser incorrectos.','¿Enviar documento y pregunta a OpenAI? Puede tener coste.','Elige archivo.','PDF: 15 páginas, 15 MB; foto: 5 MB.'],
 de:['AI Chat · Dokument','Solver AI · Aufgabe','Dokument / Foto','Datei wählen','API-Schlüssel (nur Sitzung)','KI-Modell','Frage','KI fragen','Lösen','Schließen','Lokale Extraktion…','Antwort','Nur nach Zustimmung werden Text oder Foto an einen externen Dienst gesendet. Eigener kostenpflichtiger API-Schlüssel nötig; nichts gespeichert. Fehler möglich.','Dokument mit Kostenrisiko an OpenAI senden?','Datei wählen.','PDF: 15 Seiten, 15 MB; Bild: 5 MB.'],
 pt:['AI Chat · Documento','Solver AI · Problemas','Documento/foto','Escolher ficheiro','Chave API (só nesta sessão)','Modelo AI','Pergunta','Perguntar','Resolver','Fechar','Extração local…','Resposta','Apenas após autorização, texto ou foto é enviado ao fornecedor externo. A chave API pode ter custos e não é guardada.','Enviar documento a OpenAI? Podem existir custos.','Escolha ficheiro.','PDF até 15 páginas/15 MB; foto até 5 MB.'],
 it:['AI Chat · Documento','Solver AI · Problemi','Documento/foto','Scegli file','Chiave API (solo sessione)','Modello AI','Domanda','Chiedi ad AI','Risolvi','Chiudi','Estrazione locale…','Risposta','Testo o foto inviati al servizio esterno solo dopo conferma. Serve una chiave API personale potenzialmente a pagamento, non salvata.','Inviare documento e domanda a OpenAI, con possibili costi?','Scegli file.','PDF fino a 15 pagine/15 MB; foto fino a 5 MB.']
};
const labels=(language)=>translations[language]||translations.en;
export async function extractDocumentText(file,{maxPages=15,progress=()=>{}}={}){
 if(!file||file.size>15*1024*1024)throw Error('Document exceeds 15 MB.');
 const type=file.type||'',name=file.name||'';
 if(type.startsWith('text/')||/\.(txt|md|csv)$/i.test(name))return (await file.text()).slice(0,43000);
 if(type.startsWith('image/')||/\.(png|jpe?g|webp)$/i.test(name)){
  progress('OCR image');
  const result=await recognize(file,'eng');
  return '[PAGE 1]\n'+String(result.data.text||'').slice(0,43000);
 }
 if(type==='application/pdf'||/\.pdf$/i.test(name)){
  const pdfjs=await import('pdfjs-dist');
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
  try{
   if(pdf.numPages>maxPages)throw Error('Too many pages (max '+maxPages+').');
   const result=[];
   for(let i=1;i<=pdf.numPages;i++){
    progress('Text page '+i+'/'+pdf.numPages);
    const page=await pdf.getPage(i),items=(await page.getTextContent()).items;
    let text=items.filter(item=>typeof item.str==='string').map(item=>item.str).join(' ');
    if(text.trim().length<20){
     const base=page.getViewport({scale:1});
     const view=page.getViewport({scale:Math.min(1.6,1400/Math.max(base.width,base.height))});
     const canvas=document.createElement('canvas');canvas.width=Math.round(view.width);canvas.height=Math.round(view.height);
     await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
     text=(await recognize(canvas,'eng')).data.text||'';
    }
    result.push('[PAGE '+i+']\n'+text);
    page.cleanup();
    if(result.join('\n').length>43000)break;
   }
   return result.join('\n\n').slice(0,43000);
  }finally{await pdf.destroy()}
 }
 throw Error('Only PDF, TXT and image documents are supported.');
}
export async function encodeProblemImage(file){
 if(!file||file.size>5*1024*1024)throw Error('Photo limit 5 MB');
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Choose JPG, PNG or WebP');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;
  await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad});
  const scale=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.78);
 }finally{URL.revokeObjectURL(url)}
}
export function openDocumentAI({mode='chat',language='en'}={}){
 if(!['chat','solver'].includes(mode))throw Error('Unknown AI workflow');
 const L=labels(language),cover=document.createElement('div');cover.className='rivo-code-overlay';
 const panel=document.createElement('section');panel.className='rivo-code-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[mode==='chat'?0:1]);
 const h=document.createElement('h2');h.textContent=L[mode==='chat'?0:1];panel.append(h);
 const row=(name,input)=>{
  const label=document.createElement('label');label.className='rivo-id-row';
  label.textContent=name;label.append(input);panel.append(label);return input;
 };
 const input=row(L[3],document.createElement('input'));input.type='file';input.accept='.pdf,.txt,.md,.csv,image/*';
 const key=row(L[4],document.createElement('input'));key.type='password';key.autocomplete='off';key.spellcheck=false;key.placeholder='sk-…';
 const model=row(L[5],document.createElement('input'));model.type='text';model.value=AI_DEFAULT_MODEL;model.autocomplete='off';
 const question=row(L[6],document.createElement('textarea'));question.rows=3;
 question.placeholder=mode==='chat'?'What does this document say about ...?':'Solve the question shown in the photo.';
 const notice=document.createElement('p');notice.className='rivo-code-help';notice.textContent=L[12]+' '+L[15];panel.append(notice);
 const state=document.createElement('p');state.setAttribute('role','status');panel.append(state);
 const result=document.createElement('pre');result.className='rivo-code-result';result.style.minHeight='80px';panel.append(result);
 const actions=document.createElement('div');actions.className='rivo-code-actions';panel.append(actions);
 let busy=false,closed=false,lastFile=null,docText='',history=[];
 const action=(label,callback)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',callback);actions.append(b);return b};
 const clear=()=>{
  if(busy)return;closed=true;key.value='';docText='';history=[];input.value='';result.textContent='';cover.remove();
 };
 input.addEventListener('change',()=>{lastFile=input.files?.[0]||null;docText='';history=[];result.textContent='';state.textContent=lastFile?.name||''});
 const submit=action(L[mode==='chat'?7:8],async()=>{
  if(busy)return;
  if(!lastFile){state.textContent=L[14];return}
  if(!key.value.trim()){state.textContent='Enter your personal API key.';return}
  if(!question.value.trim()){state.textContent=L[6];return}
  busy=true;submit.disabled=true;state.textContent=L[10];
  try{
   let imageDataURL=null;
   const image=/^image\//.test(lastFile.type);
   if(mode==='solver'&&image)imageDataURL=await encodeProblemImage(lastFile);
   else if(!docText)docText=await extractDocumentText(lastFile,{progress:v=>{if(!closed)state.textContent=v}});
   if(!imageDataURL&&!docText.trim())throw Error('No readable text extracted.');
   if(closed)return;
   // Consent is for the exact selected content. A new question requires a new confirmation.
   if(!window.confirm(L[13])){state.textContent='Not sent';return}
   const context=history.slice(-3).map(pair=>'Earlier question: '+pair[0]+'\nEarlier answer: '+pair[1]).join('\n');
   const request=buildAIRequest({
    mode,question:question.value+(context?'\n'+context.slice(0,2500):''),
    sourceText:docText,imageDataURL,model:model.value.trim()
   });
   state.textContent='Sending to AI provider…';
   const answer=await requestUserAI({apiKey:key.value,request});
   if(closed)return;
   result.textContent=answer;history.push([question.value.slice(0,500),answer.slice(0,2000)]);
   state.textContent=L[11]+' ✓';
  }catch(error){if(!closed)state.textContent=error?.message||String(error)}
  finally{busy=false;submit.disabled=false}
 });
 action(L[9],clear);
 cover.append(panel);document.body.append(cover);return clear;
}
