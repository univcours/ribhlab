/** Only display an offer. AdMob rewarded video starts on the user's
 * deliberate "Watch video" tap, never automatically on open or PRO usage. */
const TRANSLATIONS={
 en:{title:'Optional reward video',body:'Watch an ad to enjoy 10 minutes without full-screen ads. Every RivoScan tool remains available if you skip.',watch:'Watch video',skip:'Not now',launch:'Thanks for using RivoScan!',pro:'You have used PRO tools 3 times.'},
 ar:{title:'فيديو مكافأة اختياري',body:'يمكنك مشاهدة إعلان للحصول على 10 دقائق دون إعلانات بملء الشاشة. جميع الأدوات متاحة حتى إذا تخطّيت.',watch:'شاهد الفيديو',skip:'تخطّى',launch:'مرحبًا بعودتك إلى RivoScan!',pro:'استخدمت ميزات Pro ثلاث مرات.'},
 fr:{title:'Vidéo récompensée facultative',body:'Regardez une publicité pour 10 minutes sans annonces plein écran. Tous les outils restent accessibles si vous refusez.',watch:'Regarder la vidéo',skip:'Plus tard',launch:'Merci d’utiliser RivoScan !',pro:'Vous avez utilisé les outils Pro trois fois.'},
 es:{title:'Vídeo de recompensa opcional',body:'Mira un anuncio para disfrutar de 10 minutos sin anuncios a pantalla completa. Las herramientas siguen disponibles.',watch:'Ver vídeo',skip:'Ahora no',launch:'¡Gracias por volver!',pro:'Has usado herramientas Pro tres veces.'},
 de:{title:'Optionales Belohnungsvideo',body:'Sieh dir freiwillig Werbung für 10 Minuten ohne Vollbildanzeigen an. Alle Werkzeuge bleiben verfügbar.',watch:'Video ansehen',skip:'Nicht jetzt',launch:'Willkommen zurück!',pro:'Du hast Pro-Tools dreimal verwendet.'},
 pt:{title:'Vídeo de recompensa opcional',body:'Assista a um anúncio para ter 10 minutos sem anúncios em tela cheia. Todos os recursos continuam disponíveis.',watch:'Ver vídeo',skip:'Agora não',launch:'Bem-vindo de volta!',pro:'Usou ferramentas Pro três vezes.'},
 it:{title:'Video premio facoltativo',body:'Guarda un annuncio per 10 minuti senza annunci a schermo intero. Tutti gli strumenti restano disponibili.',watch:'Guarda il video',skip:'Non ora',launch:'Bentornato!',pro:'Hai usato gli strumenti Pro tre volte.'}
};
export function showRewardOffer({language='en',reason='pro',onWatch=()=>{},onSkip=()=>{}}={}){
 if(typeof document==='undefined'||document.querySelector('.rivo-reward-overlay'))return false;
 const t=TRANSLATIONS[language]||TRANSLATIONS.en;
 const backdrop=document.createElement('div');
 backdrop.className='rivo-reward-overlay';
 backdrop.setAttribute('role','presentation');
 const panel=document.createElement('section');
 panel.className='rivo-reward-offer-card';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','rivo-reward-title');
 panel.dir=language==='ar'?'rtl':'ltr';
 const emblem=document.createElement('div');emblem.className='rivo-reward-emblem';emblem.textContent='▶';emblem.setAttribute('aria-hidden','true');
 const headline=document.createElement('h2');headline.id='rivo-reward-title';headline.textContent=t.title;
 const detail=document.createElement('p');detail.className='rivo-reward-reason';detail.textContent=reason==='launch'?t.launch:t.pro;
 const body=document.createElement('p');body.className='rivo-reward-description';body.textContent=t.body;
 const buttons=document.createElement('div');buttons.className='rivo-reward-offer-actions';
 const skip=document.createElement('button');skip.type='button';skip.className='rivo-reward-skip';skip.textContent=t.skip;
 const watch=document.createElement('button');watch.type='button';watch.className='rivo-reward-watch';watch.textContent=t.watch;
 let dismissed=false;
 const previous=document.activeElement;
 const dismiss=(accepted=false)=>{
  if(dismissed)return;
  dismissed=true;backdrop.remove();
  if(previous?.isConnected)previous.focus?.({preventScroll:true});
  if(accepted)void Promise.resolve(onWatch()).catch(console.warn);
  else onSkip();
 };
 skip.addEventListener('click',()=>dismiss(false));
 watch.addEventListener('click',()=>dismiss(true));
 backdrop.addEventListener('click',event=>{if(event.target===backdrop)dismiss(false)});
 backdrop.addEventListener('keydown',event=>{
  if(event.key==='Escape'||event.key==='Backspace'){event.preventDefault();dismiss(false)}
  if(event.key==='Tab'){
   const first=skip,last=watch;
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 });
 buttons.append(skip,watch);panel.append(emblem,headline,detail,body,buttons);backdrop.append(panel);
 document.body.append(backdrop);skip.focus({preventScroll:true});
 return true;
}
