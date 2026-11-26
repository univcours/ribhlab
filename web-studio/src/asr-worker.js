// Separate Web Worker makes Stop terminate native WebGPU/WASM inference without freezing UI.
const MODELS={
  base:'onnx-community/whisper-base',
  small:'onnx-community/whisper-small',
  turbo:'onnx-community/whisper-large-v3-turbo'
};
const now=()=>performance.now();
self.onmessage=async({data})=>{
  if(data?.type!=='transcribe')return;
  const {audio,model,language,sampleRate}=data;
  const report=(type,extra={})=>self.postMessage({type,...extra});
  try{
    if(!MODELS[model])throw new Error('Unknown Whisper model');
    if(sampleRate!==16000)throw new Error('Whisper needs 16 kHz decoded audio');
    const wav=new Float32Array(audio);
    if(wav.length<500)throw new Error('No decoded audio');
    report('state',{phase:'Loading Whisper '+model,mode:'unknown'});
    const {pipeline}=await import('@huggingface/transformers');
    const wantGPU=Boolean(navigator.gpu);
    const progress_callback=p=>{
      if(p?.status==='progress'&&Number.isFinite(p.progress)){
        report('download',{percent:Math.floor(p.progress),
          phase:'Downloading '+(p.file||'speech model')});
      }
    };
    let transcriber=null;
    let device=wantGPU?'webgpu':'wasm';
    const errors=[];
    for(const candidate of (wantGPU?['webgpu','wasm']:['wasm'])){
      try{
        transcriber=await pipeline('automatic-speech-recognition',MODELS[model],{
          device:candidate,
          dtype:candidate==='webgpu'
            ?{encoder_model:'fp32',decoder_model_merged:'q4'}
            :{encoder_model:'fp32',decoder_model_merged:'q8'},
          progress_callback
        });
        device=candidate;
        break;
      }catch(error){
        errors.push(candidate+': '+error.message);
      }
    }
    if(!transcriber)throw new Error('Cannot load Whisper: '+errors.join(' / '));
    const duration=wav.length/16000;
    const chunkLen=20;
    const overlap=.5;
    const count=Math.ceil(duration/chunkLen);
    const collected=[];
    const startTime=now();
    report('state',{phase:'Transcribing locally with '+device,mode:device});
    for(let i=0;i<count;i++){
      const coreStart=i*chunkLen,coreEnd=Math.min(duration,(i+1)*chunkLen);
      const audioStart=Math.max(0,coreStart-overlap);
      const audioEnd=Math.min(duration,coreEnd+overlap);
      const from=Math.floor(audioStart*16000),to=Math.ceil(audioEnd*16000);
      report('state',{phase:'Audio part '+(i+1)+' of '+count,mode:device});
      const options={
        return_timestamps:true,
        task:'transcribe',
        max_new_tokens:200
      };
      if(language!=='auto'){
        options.language={ar:'arabic',fr:'french',en:'english',es:'spanish',de:'german'}[language]||language;
      }
      const result=await transcriber(wav.slice(from,to),options);
      const chunks=Array.isArray(result?.chunks)?result.chunks:[{
        text:result?.text||'',timestamp:[0,audioEnd-audioStart]
      }];
      for(const chunk of chunks){
        const a=Number(chunk.timestamp?.[0]),b=Number(chunk.timestamp?.[1]);
        if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
        const start=Math.max(0,audioStart+a);
        const end=Math.min(duration,audioStart+b);
        const mid=(start+end)/2;
        if(mid<coreStart||mid>=coreEnd||!String(chunk.text).trim())continue;
        collected.push({start,end,text:chunk.text.trim()});
      }
      const done=Math.min(duration,coreEnd);
      const elapsed=now()-startTime;
      const percent=Math.min(99,Math.floor(done/duration*100));
      const remaining=done>0?Math.max(0,Math.round(elapsed*(duration-done)/done)):null;
      report('progress',{percent,elapsed,remaining,part:i+1,parts:count,
        phase:'Transcribed '+(i+1)+' / '+count+' audio parts'});
    }
    report('done',{cues:collected,mode:device,partCount:count});
  }catch(error){
    report('error',{message:error?.message||String(error)});
  }
};
