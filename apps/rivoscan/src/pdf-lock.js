import {encryptPDF} from '@pdfsmaller/pdf-encrypt';

const ui={
 en:['Lock PDF · AES-256','Choose a PDF','Password to open','Confirm password','Owner password (optional)','Allow printing','Allow copying','Allow editing','Encrypt and save copy','Close','Choose a PDF first.','The passwords do not match.','Use at least 8 characters. A longer passphrase is safer.','Encryption failed: ','Your original PDF stays unchanged. Keep your password safe: it cannot be recovered. Permissions are advisory; only the opening password protects confidential contents.'],
 ar:['حماية PDF بكلمة سر · AES-256','اختار PDF','كلمة سر لفتح الملف','أكد كلمة السر','كلمة سر المالك (اختيارية)','السماح بالطباعة','السماح بالنسخ','السماح بالتعديل','تشفير وحفظ نسخة','إغلاق','اختار PDF أولاً.','كلمتا السر مختلفتان.','استعمل 8 رموز على الأقل، والأطول أفضل.','فشل التشفير: ','ملف PDF الأصلي كيبقى بلا تغيير. احتافظ بكلمة السر؛ ما يمكنش نسترجعوها. قيود الصلاحيات استرشادية، وكلمة سر الفتح هي اللي كتحمي المحتوى.'],
 fr:['Protéger PDF · AES-256','Choisir PDF','Mot de passe ouverture','Confirmer','Mot de passe propriétaire (optionnel)','Autoriser impression','Autoriser copie','Autoriser modification','Chiffrer et sauvegarder','Fermer','Choisissez un PDF.','Mots de passe différents.','Au moins 8 caractères; une phrase longue est préférable.','Échec chiffrement : ','Le PDF original reste intact. Conservez votre mot de passe. Les permissions sont consultatives.'],
 es:['Proteger PDF · AES-256','Elegir PDF','Contraseña','Confirmar','Contraseña propietario (opcional)','Permitir impresión','Permitir copiar','Permitir modificar','Cifrar y guardar','Cerrar','Elige PDF.','Contraseñas diferentes.','Al menos 8 caracteres.','Error: ','El PDF original se conserva. Guarde su contraseña. Los permisos son orientativos.'],
 de:['PDF verschlüsseln · AES-256','PDF wählen','Öffnungspasswort','Wiederholen','Eigentümerpasswort (optional)','Drucken erlauben','Kopieren erlauben','Ändern erlauben','Verschlüsseln','Schließen','PDF wählen.','Passwörter stimmen nicht überein.','Mindestens 8 Zeichen.','Fehler: ','Das Original bleibt unverändert. Passwort sicher aufbewahren. Berechtigungen sind nicht absolut.'],
 pt:['Proteger PDF · AES-256','Escolher PDF','Senha de abertura','Confirmar senha','Senha do proprietário (opcional)','Permitir imprimir','Permitir copiar','Permitir editar','Cifrar e guardar','Fechar','Escolha PDF.','Senhas diferentes.','Pelo menos 8 caracteres.','Erro: ','O PDF original não é alterado. Guarde a senha. Permissões são orientativas.'],
 it:['Proteggi PDF · AES-256','Scegli PDF','Password apertura','Conferma','Password proprietario (facoltativa)','Consenti stampa','Consenti copia','Consenti modifiche','Cifra e salva','Chiudi','Scegli PDF.','Le password non coincidono.','Almeno 8 caratteri.','Errore: ','Il PDF originale resta invariato. Custodisci la password. I permessi sono indicativi.']
};
export function validatePDFPassword(password,confirmed){
 if(typeof password!=='string'||password.length<8)throw Error('Password must contain at least 8 characters.');
 if(password!==confirmed)throw Error('Passwords do not match.');
 return true;
}
export async function encryptPDFCopy(bytes,userPassword,ownerPassword,permissions={}){
 validatePDFPassword(userPassword,userPassword);
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(data.length>30*1024*1024)throw Error('PDF limit: 30 MB.');
 if(String.fromCharCode(...data.slice(0,5))!=='%PDF-')throw Error('File must be a PDF.');
 if(!globalThis.crypto?.subtle)throw Error('AES-256 needs a secure Android/WebView context.');
 const encrypted=await encryptPDF(data,userPassword,{
  ownerPassword:ownerPassword||userPassword,
  algorithm:'AES-256',
  allowPrinting:permissions.print!==false,
  allowHighQualityPrint:permissions.print!==false,
  allowCopying:permissions.copy!==false,
  allowModifying:permissions.modify!==false,
  allowAnnotating:permissions.modify!==false,
  allowFillingForms:true,
  allowExtraction:true,
  allowAssembly:permissions.modify!==false
 });
 if(!encrypted?.length||encrypted.length<100)throw Error('Encrypted PDF is empty.');
 return encrypted;
}
export function openPDFLock({language='en',save,notify=()=>{}}={}){
 const L=ui[language]||ui.en;
 const cover=document.createElement('div');cover.className='rivo-code-overlay';
 const panel=document.createElement('section');panel.className='rivo-code-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const heading=document.createElement('h2');heading.textContent=L[0];panel.append(heading);
 const input=document.createElement('input');input.type='file';input.accept='.pdf,application/pdf';input.setAttribute('aria-label',L[1]);panel.append(input);
 const makeField=(label,type='password')=>{
  const wrapper=document.createElement('label');wrapper.className='rivo-id-row';wrapper.textContent=label;
  const value=document.createElement('input');value.type=type;value.autocomplete='off';wrapper.append(value);panel.append(wrapper);return value;
 };
 const password=makeField(L[2]),confirm=makeField(L[3]),owner=makeField(L[4]);
 const permissions=[];
 for(const [i,key] of [[5,'print'],[6,'copy'],[7,'modify']]){
  const row=document.createElement('label');row.className='rivo-lock-permission';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;
  row.append(checkbox,document.createTextNode(' '+L[i]));panel.append(row);
  permissions.push([key,checkbox]);
 }
 const info=document.createElement('p');info.textContent=L[14];info.className='rivo-code-help';panel.append(info);
 const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
 const actions=document.createElement('div');actions.className='rivo-code-actions';panel.append(actions);
 const makeButton=(label,click)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',click);actions.append(button);return button;};
 let busy=false,closed=false;
 const close=()=>{if(busy)return;closed=true;password.value='';confirm.value='';owner.value='';cover.remove()};
 const encrypt=makeButton(L[8],async()=>{
  if(busy)return;
  const file=input.files?.[0];if(!file){status.textContent=L[10];return}
  if(password.value!==confirm.value){status.textContent=L[11];return}
  if(password.value.length<8){status.textContent=L[12];return}
  busy=true;encrypt.disabled=true;status.textContent=L[8]+' …';
  try{
   const bytes=await encryptPDFCopy(new Uint8Array(await file.arrayBuffer()),password.value,owner.value,
    Object.fromEntries(permissions.map(([k,c])=>[k,c.checked])));
   await save(bytes,'RivoScan_Locked_'+file.name.replace(/\.pdf$/i,'')+'_'+Date.now()+'.pdf','application/pdf');
   if(!closed){busy=false;notify('AES-256 ✓');close()}
  }catch(error){if(!closed){busy=false;status.textContent=L[13]+(error?.message||String(error))}}
  finally{encrypt.disabled=false}
 });
 makeButton(L[9],close);
 cover.append(panel);document.body.append(cover);
 cover.addEventListener('click',e=>{if(e.target===cover)close()});
 return close;
}
