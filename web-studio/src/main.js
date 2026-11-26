import './style.css';
import {parseSubtitles,toSrt,toVtt,toTxt,activeCue,clock,clean,rgba,clamp} from './captions.js';
import {videoToAudio,cancelFfmpeg,recordCaptions,convertToMp4} from './media.js';

const $=id=>document.getElementById(id);
const video=$('video');
const defaultSettings={model:'small',language:'auto',quality:720,preferMp4:true,translationSource:'ar',translationTarget:'fr'};
const defaults={style:'classic',textColor:'#ffffff',bgColor:'#20182c',fontSize:36,position:'bottom'};
function loadOptions(){
  try{return {...defaultSettings,...JSON.parse(localStorage.getItem('rivocaption-site-options')||'{}')}}
  catch{return {...defaultSettings}}
}
const state={
  file:null,url:null,cues:[],originalCues:[],settings:loadOptions(),style:{...defaults},
  tab:'ai',expanded:false,controller:null,worker:null,task:null,runId:0
};
const status=(message,kind='')=>{
  $('message').textContent=message;
  $('message').className='message'+(kind?' '+kind:'');
};
const download=(name,blob)=>{
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
};
function clockPretty(seconds){return clock(seconds)}
function syncSettings(){
  const p=state.settings;
  $('modelSelect').value=p.model;
  $('languageSelect').value=p.language;
  $('qualitySelect').value=String(p.quality);
  $('preferMp4').checked=!!p.preferMp4;
  $('translationSource').value=p.translationSource;
  $('translationTarget').value=p.translationTarget;
  $('settingsSummary').textContent=
    'Offline · '+{base:'Whisper Base',small:'Whisper Small',turbo:'Whisper Large v3 Turbo'}[p.model]+
    ' · '+{auto:'Auto-detect / mixed',ar:'الدارجة / Arabic',fr:'Français',en:'English',es:'Español',de:'Deutsch'}[p.language];
  $('exportSummary').textContent='Video: up to '+p.quality+'p · original aspect ratio · '+
    (p.preferMp4?'MP4 preferred':'WebM preferred');
  localStorage.setItem('rivocaption-site-options',JSON.stringify(p));
}
function openSettings(){
  syncSettings();$('settingsDialog').showModal();$('settingsButton').classList.add('is-active');
}
function closeSettings(){
  $('settingsDialog').close();$('settingsButton').classList.remove('is-active');syncSettings();
}
$('settingsButton').onclick=openSettings;
document.querySelectorAll('.open-settings').forEach(b=>b.onclick=openSettings);
$('closeSettings').onclick=closeSettings;
$('doneSettings').onclick=closeSettings;
$('settingsDialog').addEventListener('close',()=>{$('settingsButton').classList.remove('is-active');syncSettings()});
for(const [id,key,convert] of [
  ['modelSelect','model',String],['languageSelect','language',String],
  ['qualitySelect','quality',Number],
  ['translationSource','translationSource',String],
  ['translationTarget','translationTarget',String]
]){
  $(id).onchange=e=>{state.settings[key]=convert(e.target.value);syncSettings()};
}
$('preferMp4').onchange=e=>{state.settings.preferMp4=e.target.checked;syncSettings()};
$('resetSettings').onclick=()=>{state.settings={...defaultSettings};syncSettings();status('Preferences reset to defaults.','success')};
syncSettings();

function setTab(name){
  state.tab=name;
  document.querySelectorAll('.tab').forEach(tab=>{
    const yes=tab.dataset.tab===name;tab.classList.toggle('is-active',yes);
    tab.setAttribute('aria-selected',String(yes));
  });
  document.querySelectorAll('.tool-panel').forEach(panel=>{
    panel.classList.toggle('hidden',panel.dataset.panel!==name);
  });
  if(name==='captions')renderCaptions();
}
document.querySelectorAll('.tab').forEach(el=>el.onclick=()=>setTab(el.dataset.tab));
$('openButton').onclick=()=>{$('videoInput').click()};
$('chooseButton').onclick=()=>{$('videoInput').click()};
$('projectButton').onclick=saveProject;
$('videoInput').addEventListener('change',e=>{
  if(e.target.files[0])openVideo(e.target.files[0]);
  e.target.value='';
});

function openVideo(file){
  if(!file.type.startsWith('video/')&&!/\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name)){
    status('Please choose a valid video file','error');return;
  }
  cancelTask(true);
  if(state.url)URL.revokeObjectURL(state.url);
  state.file=file;
  state.url=URL.createObjectURL(file);
  video.pause();video.src=state.url;video.load();
  state.cues=[];state.originalCues=[];renderCaptions();setTab('ai');
  $('videoStage').classList.add('has-video');$('emptyPreview').classList.add('hidden');
  $('videoInfo').textContent=file.name;
  status('Loaded '+file.name+'. Choose AI Speech, or import/edit subtitles.','success');
}
$('videoStage').addEventListener('dragover',e=>e.preventDefault());
$('videoStage').addEventListener('drop',e=>{
  e.preventDefault();const file=e.dataTransfer?.files?.[0];if(file)openVideo(file);
});
video.addEventListener('loadedmetadata',()=>{updatePlayback();drawOverlay()});
video.addEventListener('timeupdate',()=>{updatePlayback();drawOverlay();highlightCurrent()});
video.addEventListener('play',()=>{$('playIcon').textContent='pause'});
video.addEventListener('pause',()=>{$('playIcon').textContent='play_arrow'});
function updatePlayback(){
  const t=Number.isFinite(video.currentTime)?video.currentTime:0;
  const duration=Number.isFinite(video.duration)?video.duration:0;
  $('currentTime').textContent=clockPretty(t)+' / '+clockPretty(duration);
  $('seek').value=duration?String(Math.round(t/duration*1000)):'0';
}
$('seek').addEventListener('input',e=>{if(video.duration)video.currentTime=Number(e.target.value)/1000*video.duration});
$('playButton').onclick=()=>{if(!state.file)return status('Choose a video first.');if(video.paused)video.play().catch(e=>status(e.message,'error'));else video.pause()};
$('backButton').onclick=()=>{if(state.file)video.currentTime=Math.max(0,video.currentTime-10)};
$('forwardButton').onclick=()=>{if(state.file)video.currentTime=Math.min(video.duration||0,video.currentTime+10)};
$('speedButton').onclick=()=>{
  const speeds=[1,1.25,1.5,2,.75];video.playbackRate=speeds[(speeds.indexOf(video.playbackRate)+1)%speeds.length];
  $('speedButton').textContent=video.playbackRate+'×';
};
$('muteButton').onclick=()=>{video.muted=!video.muted;$('muteButton').firstElementChild.textContent=video.muted?'volume_off':'volume_up'};
$('fullscreenButton').onclick=()=>{(document.fullscreenElement?document.exitFullscreen():$('videoStage').requestFullscreen()).catch?.(()=>{})};
$('expandButton').onclick=()=>{
  state.expanded=!state.expanded;$('videoStage').classList.toggle('expanded',state.expanded);
  $('expandButton').textContent=state.expanded?'Compact':'Enlarge';
};
function syncOverlayStyle(){
  const o=$('captionOverlay');
  o.style.color=state.style.textColor;
  o.style.background=state.style.style==='minimal'?'transparent':rgba(state.style.bgColor,
    state.style.style==='cinema'?.76:.86);
  o.style.fontSize=Math.round(state.style.fontSize*(window.innerWidth<600?.57:1))+'px';
  o.dataset.position=state.style.position;
}
function drawOverlay(){
  syncOverlayStyle();
  const cue=activeCue(state.cues,video.currentTime||0);
  const el=$('captionOverlay');
  el.textContent=cue?.text||'';
  el.classList.toggle('visible',Boolean(cue));
}
function highlightCurrent(){
  const cue=activeCue(state.cues,video.currentTime||0);
  for(const el of document.querySelectorAll('[data-cue]')){
    el.classList.toggle('is-current',el.dataset.cue===cue?.id);
  }
}
function renderCaptions(){
  const list=$('captionList'),timeline=$('captionTimeline');
  list.replaceChildren();timeline.replaceChildren();
  $('captionCount').textContent=state.cues.length;
  if(!state.cues.length){
    const empty=document.createElement('p');
    empty.className='empty-caption';
    empty.textContent='Transcribe audio, import SRT/VTT, or add a caption manually.';
    list.append(empty);drawOverlay();return;
  }
  state.cues=clean(state.cues);
  for(const cue of state.cues){
    const pill=document.createElement('button');
    pill.className='cue-pill';pill.dataset.cue=cue.id;
    pill.textContent=clock(cue.start)+' · '+cue.text.slice(0,35);
    pill.title='Seek to '+clock(cue.start);
    pill.onclick=()=>{video.currentTime=cue.start;video.pause()};
    timeline.append(pill);
    const row=document.createElement('article');
    row.className='cue-row';row.dataset.cue=cue.id;
    const start=document.createElement('label');start.textContent='Start (sec)';
    const startInput=document.createElement('input');startInput.type='number';startInput.min='0';startInput.step='.01';startInput.value=cue.start.toFixed(2);start.append(startInput);
    const end=document.createElement('label');end.textContent='End (sec)';
    const endInput=document.createElement('input');endInput.type='number';endInput.min='.01';endInput.step='.01';endInput.value=cue.end.toFixed(2);end.append(endInput);
    const text=document.createElement('label');text.textContent='Caption';
    const area=document.createElement('textarea');area.value=cue.text;area.dir='auto';area.rows=2;text.append(area);
    const del=document.createElement('button');del.title='Delete caption';del.setAttribute('aria-label','Delete caption');del.textContent='×';
    del.onclick=()=>{state.cues=state.cues.filter(c=>c.id!==cue.id);renderCaptions();status('Caption deleted.')};
    const update=()=>{
      const a=Number(startInput.value),b=Number(endInput.value);
      if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a){
        status('Caption end time must be greater than start time.','error');return;
      }
      cue.start=a;cue.end=b;cue.text=area.value;drawOverlay();
      state.cues=clean(state.cues);$('captionCount').textContent=state.cues.length;
    };
    for(const input of [startInput,endInput,area])input.addEventListener('change',update);
    row.append(start,end,text,del);list.append(row);
  }
  drawOverlay();highlightCurrent();
}
$('addCaption').onclick=()=>{
  const at=Number.isFinite(video.currentTime)?video.currentTime:0;
  state.cues.push({id:crypto.randomUUID(),start:at,end:at+2.5,text:'New caption'});
  renderCaptions();setTab('captions');
  $('captionList').lastElementChild?.querySelector('textarea')?.focus();
};
$('importCaption').onclick=()=>{$('captionInput').click()};
$('captionInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.name.endsWith('.json')){
      const saved=JSON.parse(await file.text());
      if(!Array.isArray(saved.cues))throw new Error('Invalid RivoCaption project JSON');
      state.cues=clean(saved.cues);state.originalCues=[];
      if(saved.style)state.style={...defaults,...saved.style};
      applyStyleUI();
    }else{
      const cues=parseSubtitles(await file.text());
      if(!cues.length)throw new Error('No valid subtitle timestamps found');
      state.cues=cues;state.originalCues=[];
    }
    renderCaptions();setTab('captions');status('Imported '+state.cues.length+' captions.','success');
  }catch(error){status('Import failed: '+error.message,'error')}
  e.target.value='';
});
$('restoreCaptions').onclick=()=>{
  if(!state.originalCues.length)return status('No original translation snapshot to restore.');
  state.cues=clean(state.originalCues);state.originalCues=[];
  renderCaptions();status('Restored original captions.','success');
};
$('translateCaptions').onclick=async()=>{
  if(!state.cues.length)return status('Add or import captions to translate.','error');
  if(state.task)return status('Cancel the current operation first.','error');
  if(!('Translator' in window)){
    return status('This browser lacks the local Translator API. Use RivoCaption Android or a supported browser.','error');
  }
  const {translationSource:sourceLanguage,translationTarget:targetLanguage}=state.settings;
  if(sourceLanguage===targetLanguage)return status('Choose two different languages in Settings.','error');
  const runId=++state.runId;
  const controller=new AbortController();
  state.controller=controller;state.task='translate';
  const initial=state.cues.map(x=>({...x}));
  try{
    startTask('TRANSLATING',null,'Checking local browser translator…');
    const available=await window.Translator.availability({sourceLanguage,targetLanguage});
    if(available==='unavailable')throw new Error('This language pair is not available on this browser');
    const translator=await window.Translator.create({sourceLanguage,targetLanguage});
    const translated=[];
    for(let i=0;i<initial.length;i++){
      if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
      const text=await translator.translate(initial[i].text);
      translated.push({...initial[i],text});
      if(runId===state.runId)startTask('TRANSLATING',
        Math.min(99,Math.floor((i+1)/initial.length*100)),
        'Translated '+(i+1)+' of '+initial.length+' caption lines');
    }
    translator.destroy?.();
    if(runId!==state.runId)return;
    state.originalCues=initial;state.cues=clean(translated);
    renderCaptions();setTab('captions');
    status('Offline translation completed. Review terminology and timing.','success');
  }catch(error){
    if(runId===state.runId&&error.name!=='AbortError')
      status('Offline translation unavailable: '+error.message,'error');
  }finally{
    if(runId===state.runId){
      state.task=null;state.controller=null;hideTask();
    }
  }
};
function saveAs(type){
  if(!state.cues.length)return status('No captions to export.','error');
  const name=(state.file?.name||'RivoCaption').replace(/\.[^.]+$/,'');
  const content={srt:toSrt,vtt:toVtt,txt:toTxt}[type](state.cues);
  const mime={srt:'application/x-subrip',vtt:'text/vtt',txt:'text/plain'}[type];
  download(name+'.'+type,new Blob([content],{type:mime+';charset=utf-8'}));
  status('Saved '+type.toUpperCase()+' subtitles.','success');
}
function saveProject(){
  const content=JSON.stringify({schema:'rivocaption-web-v1',cues:state.cues,
    style:state.style,settings:state.settings,videoName:state.file?.name||null},null,2);
  download('RivoCaption-project.json',new Blob([content],{type:'application/json'}));
  status('Project metadata saved. Re-select the video after reopening the project.','success');
}
$('exportCaptionsQuick').onclick=()=>saveAs('srt');
$('exportSrt').onclick=()=>saveAs('srt');
$('exportVtt').onclick=()=>saveAs('vtt');
$('exportTxt').onclick=()=>saveAs('txt');
$('exportJson').onclick=saveProject;

function applyStyleUI(){
  const s=state.style;
  for(const [id,key] of [['textColor','textColor'],['bgColor','bgColor'],['fontSize','fontSize'],['captionPosition','position']])$(id).value=s[key];
  $('fontSizeValue').textContent=s.fontSize;
  document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('is-active',b.dataset.style===s.style));
  drawOverlay();
}
const presets={
  classic:{textColor:'#ffffff',bgColor:'#20182c',fontSize:36,position:'bottom'},
  cinema:{textColor:'#fff3d9',bgColor:'#0f1118',fontSize:31,position:'bottom'},
  highlight:{textColor:'#141124',bgColor:'#ffca7b',fontSize:39,position:'center'},
  minimal:{textColor:'#ffffff',bgColor:'#000000',fontSize:29,position:'bottom'}
};
document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>{
  state.style={...state.style,style:b.dataset.style,...presets[b.dataset.style]};
  applyStyleUI();
});
for(const [id,key] of [['textColor','textColor'],['bgColor','bgColor'],['fontSize','fontSize'],['captionPosition','position']]){
  $(id).addEventListener('input',e=>{
    state.style[key]=key==='fontSize'?Number(e.target.value):e.target.value;
    $('fontSizeValue').textContent=state.style.fontSize;drawOverlay();
  });
}
applyStyleUI();

function startTask(name,percent=null,detail='',remainingMs=null){
  $('progressStrip').classList.remove('hidden');
  $('progressTitle').textContent=name;
  $('progressDetail').textContent=detail;
  $('progressPercent').textContent=percent==null?'Working':Math.min(99,percent)+'%';
  const fill=$('progressFill');fill.classList.toggle('indeterminate',percent===null);
  fill.style.width=percent===null?'30%':Math.min(99,percent)+'%';
  $('progressTime').textContent=remainingMs==null?'Time remaining: calculating…':
    '≈'+clock(Math.ceil(remainingMs/1000))+' remaining';
}
function hideTask(){
  $('progressStrip').classList.add('hidden');
  $('progressFill').classList.remove('indeterminate');
}
function cancelTask(silent=false){
  if(!state.task)return;
  state.runId+=1;
  state.controller?.abort();
  state.worker?.terminate();
  state.worker=null;state.controller=null;state.task=null;
  cancelFfmpeg();video.pause();
  hideTask();
  if(!silent)status('Operation cancelled. The source video was not changed.','success');
}
$('cancelButton').onclick=()=>cancelTask();

$('transcribeButton').onclick=async()=>{
  if(!state.file)return status('Choose a video before transcription.','error');
  if(state.task)return status('Finish or cancel the active task first.');
  const runId=++state.runId;
  const abort=new AbortController();
  state.controller=abort;state.task='asr';
  const started=performance.now();
  const set=(phase,pct=null,remaining=null)=>{
    if(state.runId===runId)startTask('AI SPEECH',pct,phase,
      remaining==null?null:remaining);
  };
  $('transcribeButton').disabled=true;
  try{
    set('Loading local audio engine…');
    const audio=await videoToAudio(state.file,(phase,pct)=>set(phase,pct),abort.signal);
    if(abort.signal.aborted)throw new DOMException('Cancelled','AbortError');
    set('Preparing multilingual Whisper…');
    const worker=new Worker(new URL('./asr-worker.js',import.meta.url),{type:'module'});
    state.worker=worker;
    const cues=await new Promise((resolve,reject)=>{
      worker.onmessage=e=>{
        if(state.runId!==runId)return;
        const data=e.data;
        if(data.type==='download')set(data.phase,null);
        else if(data.type==='state')set(data.phase,null);
        else if(data.type==='progress')set(data.phase,data.percent,data.remaining);
        else if(data.type==='done')resolve(data.cues);
        else if(data.type==='error')reject(new Error(data.message));
      };
      worker.onerror=e=>reject(new Error('Whisper worker failed: '+e.message));
      worker.postMessage({
        type:'transcribe',audio:audio.buffer,model:state.settings.model,
        language:state.settings.language,sampleRate:16000
      },[audio.buffer]);
    });
    if(state.runId!==runId)return;
    state.cues=clean(cues);
    renderCaptions();setTab('captions');
    status(state.cues.length?
      'Whisper created '+state.cues.length+' captions. Review Darija spelling and timestamps.':
      'No words detected. Try a different language or clearer audio.',
      state.cues.length?'success':'');
  }catch(error){
    if(state.runId===runId&&error.name!=='AbortError')
      status('Transcription failed: '+error.message+'. Try Fast/Base and a shorter clip.','error');
  }finally{
    if(state.runId===runId){
      state.worker?.terminate();state.worker=null;state.controller=null;state.task=null;
      $('transcribeButton').disabled=false;hideTask();
    }
  }
};

function drawBurnedCaptions(ctx,width,height,time){
  const cue=activeCue(state.cues,time);if(!cue)return;
  const {textColor,bgColor,fontSize,position,style}=state.style;
  const pixels=clamp(fontSize*(width/720),16,86);
  ctx.save();
  ctx.font='800 '+pixels+'px system-ui,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  const safeWidth=width*.84;
  const lines=[];let line='';
  for(const word of cue.text.split(/\s+/)){
    if(ctx.measureText(line?line+' '+word:word).width>safeWidth&&line){lines.push(line);line=word}
    else line=line?line+' '+word:word;
  }
  if(line)lines.push(line);
  const lineHeight=pixels*1.27;
  const blockHeight=lines.length*lineHeight+16;
  const y=position==='top'?height*.10:position==='center'?height*.5:height*.87;
  const top=clamp(y-blockHeight/2,7,height-blockHeight-7);
  if(style!=='minimal'){
    ctx.fillStyle=rgba(bgColor,.82);
    const maxWidth=Math.min(width*.92,
      Math.max(...lines.map(l=>ctx.measureText(l).width),60)+24);
    ctx.beginPath();
    ctx.roundRect(width/2-maxWidth/2,top,maxWidth,blockHeight,11);
    ctx.fill();
  }
  ctx.fillStyle=textColor;ctx.strokeStyle='rgba(0,0,0,.63)';
  ctx.lineWidth=Math.max(1,pixels/11);
  lines.forEach((text,i)=>{
    const ty=top+12+(i+.5)*lineHeight;
    ctx.strokeText(text,width/2,ty);
    ctx.fillText(text,width/2,ty);
  });
  ctx.restore();
}

$('exportVideo').onclick=async()=>{
  if(!state.file)return status('Choose a video before exporting.','error');
  if(!state.cues.length)return status('Add or import captions before exporting video.','error');
  if(state.task)return status('Cancel the active task first.','error');
  const runId=++state.runId,abort=new AbortController();
  state.controller=abort;state.task='export';$('exportVideo').disabled=true;
  const started=performance.now();
  try{
    startTask('VIDEO EXPORT',0,'Preparing frame capture…');
    let {blob,format}=await recordCaptions({
      video,maxDim:state.settings.quality,preferMp4:state.settings.preferMp4,
      signal:abort.signal,canvasDraw:drawBurnedCaptions,
      onProgress:(pct,secondsLeft)=>{
        if(runId===state.runId)startTask('VIDEO EXPORT',pct,
          'Recording captioned video in real time',
          Math.max(0,Math.ceil(secondsLeft*1000)));
      }
    });
    if(abort.signal.aborted)throw new DOMException('Cancelled','AbortError');
    if(format==='webm'&&state.settings.preferMp4){
      try{
        startTask('MP4 CONVERSION',null,'Preparing local video encoder…');
        blob=await convertToMp4(blob,(text,pct)=>{
          if(runId===state.runId)startTask('MP4 CONVERSION',pct,text);
        },abort.signal);
        format='mp4';
      }catch(err){
        if(abort.signal.aborted)throw err;
        status('MP4 conversion unavailable; exporting supported WebM instead. '+err.message);
      }
    }
    if(runId===state.runId){
      const name=(state.file.name||'RivoCaption').replace(/\.[^.]+$/,'');
      startTask('SAVING VIDEO',99,'Preparing download…');
      download(name+'-captioned.'+format,blob);
      status('Captioned '+format.toUpperCase()+' ready. Your browser may ask where to save it.','success');
    }
  }catch(error){
    if(runId===state.runId&&error.name!=='AbortError')
      status('Video export failed: '+error.message,'error');
  }finally{
    if(runId===state.runId){
      state.task=null;state.controller=null;hideTask();$('exportVideo').disabled=false;
    }
  }
};

window.addEventListener('beforeunload',()=>{state.worker?.terminate();cancelFfmpeg();if(state.url)URL.revokeObjectURL(state.url)});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
$('runtimeInfo').textContent=navigator.gpu?'WebGPU available':'WASM fallback available';
