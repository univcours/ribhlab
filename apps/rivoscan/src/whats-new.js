// Version-aware release notes. Deliberately includes ONLY features with real implementation.
export const changesForVersion=(language='en')=>{
 const data={
 en:{title:"What's New in RivoScan",subtitle:'Release',close:'Got it',items:['Protect PDF documents locally with AES-256 passwords and print/copy/edit permissions. Translate photo text on-device after the language models download. Export PowerPoint slides with genuinely editable OCR/PDF text boxes (complex layouts remain approximate). ID photos can optionally replace their background locally, and signatures can be dragged and resized.','Draw your signature immediately after taking a scan, before ✓ saving.','Guide book-page curve correction with a manual slider (not automatic 3D restoration).','Scan QR codes and barcodes from a camera photo or an imported image, fully offline.','Prepare printable 10 × 15 cm ID-photo sheets at 300 DPI with different photo sizes.','Manage scan pages: select, rotate, reorder and delete before PDF assembly.','Export actual editable XLSX OCR workbooks.','Select an area for local background-aware erase, restore photo noise, split book pages or count common objects with a downloadable on-device model.'],limits:'Photo sheets do not remove portrait backgrounds; QR links only open after your confirmation. Advanced AI, true 3D page dewarping and complex Office layout recovery are still under development.'},
 ar:{title:'شنو الجديد فـRivoScan',subtitle:'النسخة',close:'فهمت',items:['حماية PDF بتشفير AES-256 وكلمة سر وصلاحيات الطباعة والنسخ. وترجمة الكتابة المصوّرة على الجهاز بعد تحميل نماذج اللغات. وتصدير PowerPoint بمربعات نص قابلة للتعديل مع بقاء التنسيق المعقد تقريبياً. وزدنا تبديل خلفية الصور الشخصية محلياً وتحريك التوقيع وتعديل الحجم.','التوقيع باليد مباشرة بعد تصوير الوثيقة وقبل ✓.','تقويم انحناء صفحات الكتاب يدوياً، ماشي إصلاح ثلاثي الأبعاد أوتوماتيكي.','قراءة QR والباركود من صورة الكاميرا أو المعرض، بلا رفع للخادم.','إنشاء ورقة صور شخصية 10 × 15 سم بدقة 300 DPI مع مقاسات مختلفة.','اختيار صفحات السكانير وترتيبها وتدويرها وحذفها قبل إنشاء PDF.','تصدير Excel بصيغة XLSX قابلة للتعديل من النص المستخرج.'],limits:'صور البطاقة ما كتبدلش الخلفية ديال الشخص؛ الروابط ما كتتحلش بلا موافقتك. إصلاح الطيات ثلاثية الأبعاد وميزات AI المعقدة مازال ما تكملوش.'},
 fr:{title:'Nouveautés RivoScan',subtitle:'Version',close:'Compris',items:['Lire les codes QR et codes-barres depuis la caméra ou une photo, hors ligne.','Créer des planches de photos identité de 10 × 15 cm à 300 DPI.','Sélectionner, déplacer, tourner ou retirer des pages avant le PDF.','Exporter du texte OCR en classeur Excel XLSX modifiable.'],limits:'Aucun détourage automatique des portraits ; ouverture des liens sur confirmation. L’IA et le redressement 3D avancé ne sont pas finalisés.'},
 es:{title:'Novedades de RivoScan',subtitle:'Versión',close:'Entendido',items:['Leer QR y códigos de barras sin subir imágenes.','Crear hojas de fotos de carné 10 × 15 cm a 300 DPI.','Seleccionar, mover, girar y quitar páginas antes del PDF.','Exportar OCR a Excel XLSX editable.'],limits:'No elimina el fondo; los enlaces requieren confirmación. Funciones de IA y corrección 3D aún pendientes.'},
 de:{title:'Neu in RivoScan',subtitle:'Version',close:'Verstanden',items:['QR- und Barcodes offline aus Fotos lesen.','Passfoto-Bögen 10 × 15 cm mit 300 DPI erzeugen.','Seiten vor dem PDF verwalten.','OCR-Texte als bearbeitbare XLSX exportieren.'],limits:'Keine Hintergrundentfernung; Links nur nach Bestätigung. KI und 3D-Entzerrung noch nicht fertig.'},
 pt:{title:'Novidades RivoScan',subtitle:'Versão',close:'Entendi',items:['Ler QR e códigos de barras sem upload.','Criar folhas de fotos de identificação de 10 × 15 cm a 300 DPI.','Organizar páginas antes de criar PDF.','Exportar OCR em Excel XLSX editável.'],limits:'Não remove fundos; links exigem confirmação. IA e correção 3D ainda pendentes.'},
 it:{title:'Novità RivoScan',subtitle:'Versione',close:'Capito',items:['Leggere QR e codici a barre offline.','Creare fogli fototessera da 10 × 15 cm a 300 DPI.','Gestire pagine prima del PDF.','Esportare OCR in XLSX modificabile.'],limits:'Non rimuove gli sfondi; link aperti solo su conferma. AI e raddrizzamento 3D non ancora completati.'}
 };
 return data[language]||data.en;
};
export const shouldShowReleaseNotes=(storage,version)=>storage.getItem('rivo-release-notes-read')!==version;
export function openWhatsNew({language='en',version='0.0.0',storage=localStorage}={}){
 const copy=changesForVersion(language);
 const overlay=document.createElement('div');overlay.className='rivo-release-overlay';
 const panel=document.createElement('section');panel.className='rivo-release-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=copy.title;panel.append(title);
 const subtitle=document.createElement('p');subtitle.textContent=copy.subtitle+' '+version;panel.append(subtitle);
 const list=document.createElement('ul');for(const note of copy.items){const item=document.createElement('li');item.textContent=note;list.append(item)}panel.append(list);
 const limits=document.createElement('p');limits.className='rivo-release-limits';limits.textContent=copy.limits;panel.append(limits);
 const ok=document.createElement('button');ok.type='button';ok.textContent=copy.close;panel.append(ok);
 const close=()=>{overlay.remove();try{storage.setItem('rivo-release-notes-read',version)}catch{}};
 ok.addEventListener('click',close);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
 overlay.append(panel);document.body.append(overlay);
 ok.focus();
 return close;
}
