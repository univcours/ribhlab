import {FFmpeg} from '@ffmpeg/ffmpeg';
import {fetchFile} from '@ffmpeg/util';
let engine=null;
let isLoaded=false;
let currentAbort=null;
const ext=file=>((file.name||'').match(/\.[a-z0-9]{2,5}$/i)||['.mp4'])[0].toLowerCase();

export async function ensureFfmpeg(onMessage=()=>{}){
  if(engine&&isLoaded)return engine;
  engine=new FFmpeg();
  const loaded=engine;
  const coreURL=new URL('./ffmpeg-core/ffmpeg-core.js',document.baseURI).href;
  const wasmURL=new URL('./ffmpeg-core/ffmpeg-core.wasm',document.baseURI).href;
  onMessage('Loading the local FFmpeg audio engine…');
  await loaded.load({coreURL,wasmURL});
  if(loaded!==engine)throw new Error('Media preparation cancelled');
  isLoaded=true;
  return loaded;
}
export function cancelFfmpeg(){if(engine){try{engine.terminate()}catch{}engine=null;isLoaded=false}}

export async function videoToAudio(file,onMessage,signal){
  if(!file)throw new Error('Choose a video before transcription');
  if(file.size>1_500_000_000)throw new Error('This video is too large for in-browser audio extraction. Use a shorter file.');
  const ff=await ensureFfmpeg(onMessage);
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const input='video_input'+ext(file);
  onMessage('Reading video into local memory…');
  try{
    await ff.writeFile(input,await fetchFile(file));
    onMessage('Extracting 16 kHz mono audio…');
    const progress=({progress})=>onMessage('Extracting audio',Math.min(99,Math.floor((progress||0)*100)));
    ff.on('progress',progress);
    try{
      const exit=await ff.exec(['-hide_banner','-loglevel','error','-i',input,
        '-vn','-ac','1','-ar','16000','-c:a','pcm_s16le','audio.wav'], -1);
      if(exit!==0)throw new Error('FFmpeg could not decode the video soundtrack');
    }finally{ff.off('progress',progress)}
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const raw=await ff.readFile('audio.wav');
    const context=new (window.AudioContext||window.webkitAudioContext)({sampleRate:16000});
    try{
      const buffer=await context.decodeAudioData(raw.buffer.slice(raw.byteOffset,
        raw.byteOffset+raw.byteLength));
      const mono=buffer.getChannelData(0);
      if(!mono.length)throw new Error('No decoded audio samples');
      if(buffer.sampleRate!==16000)throw new Error('Decoded audio sample rate is not 16000 Hz');
      return new Float32Array(mono);
    }finally{await context.close()}
  }finally{
    await ff.deleteFile(input).catch(()=>{});
    await ff.deleteFile('audio.wav').catch(()=>{});
  }
}

let audioRoute=null;
function audioForVideo(video){
  if(audioRoute?.video===video)return audioRoute;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const source=ctx.createMediaElementSource(video);
  const speaker=ctx.createGain();
  source.connect(speaker);speaker.connect(ctx.destination);
  const destination=ctx.createMediaStreamDestination();
  source.connect(destination);
  audioRoute={video,ctx,speaker,destination};
  return audioRoute;
}

export async function recordCaptions({
  video,canvasDraw,maxDim=720,preferMp4=true,onProgress=()=>{},signal
}){
  if(!video?.duration||!Number.isFinite(video.duration))throw new Error('Load a complete video before exporting');
  if(!('MediaRecorder' in window)||!HTMLCanvasElement.prototype.captureStream)
    throw new Error('This browser cannot capture captioned video; export SRT instead');
  const canvas=document.createElement('canvas');
  const w=video.videoWidth,h=video.videoHeight;
  if(!w||!h)throw new Error('Video dimensions are unavailable');
  const scale=Math.min(1,maxDim/Math.max(w,h));
  canvas.width=Math.max(2,Math.round(w*scale/2)*2);
  canvas.height=Math.max(2,Math.round(h*scale/2)*2);
  const ctx=canvas.getContext('2d',{alpha:false});
  const capture=canvas.captureStream(30);
  const trackState=audioForVideo(video);
  await trackState.ctx.resume();
  trackState.speaker.gain.value=0;
  for(const track of trackState.destination.stream.getAudioTracks())capture.addTrack(track);
  const types=preferMp4
    ?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
    :['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const mime=types.find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime)throw new Error('No MediaRecorder video format supported');
  const recorder=new MediaRecorder(capture,{mimeType:mime,videoBitsPerSecond:3_500_000});
  const parts=[];
  const initialTime=video.currentTime;
  const initialRate=video.playbackRate;
  let raf=0,active=true;
  const ended=()=>{if(recorder.state!=='inactive')recorder.stop()};
  const paint=()=>{
    if(!active)return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    canvasDraw(ctx,canvas.width,canvas.height,video.currentTime);
    onProgress(Math.min(99,Math.floor(video.currentTime/video.duration*100)),
      Math.max(0,video.duration-video.currentTime));
    if(!video.ended)raf=requestAnimationFrame(paint);
  };
  const cleanup=()=>{
    active=false;cancelAnimationFrame(raf);
    video.removeEventListener('ended',ended);
    capture.getVideoTracks().forEach(t=>t.stop());
    trackState.speaker.gain.value=1;
    video.pause();video.playbackRate=initialRate;
    if(Number.isFinite(initialTime))video.currentTime=initialTime;
  };
  const promise=new Promise((resolve,reject)=>{
    recorder.ondataavailable=e=>{if(e.data?.size)parts.push(e.data)};
    recorder.onerror=e=>reject(e.error||new Error('Recording error'));
    recorder.onstop=()=>resolve(new Blob(parts,{type:mime.split(';')[0]}));
  });
  const abort=()=>{if(recorder.state!=='inactive')recorder.stop()};
  signal?.addEventListener('abort',abort,{once:true});
  video.pause();
  video.playbackRate=1;
  video.currentTime=0;
  try{
    await new Promise(resolve=>{
      if(video.readyState>=2&&video.currentTime<.05)return resolve();
      video.addEventListener('seeked',resolve,{once:true});
    });
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    recorder.start(1000);
    video.addEventListener('ended',ended,{once:true});
    paint();
    await video.play();
    const blob=await promise;
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if(!blob.size)throw new Error('Recording contains no video frames');
    return {blob,format:mime.includes('mp4')?'mp4':'webm'};
  }finally{signal?.removeEventListener('abort',abort);cleanup()}
}

export async function convertToMp4(blob,onProgress,signal){
  if(blob.size>300_000_000)throw new Error('Recorded video too large for browser MP4 conversion');
  const ff=await ensureFfmpeg(text=>onProgress(text,null));
  const progress=({progress})=>onProgress('Converting WebM to MP4',
    Math.min(99,Math.floor((progress||0)*100)));
  ff.on('progress',progress);
  try{
    await ff.writeFile('recorded.webm',await fetchFile(blob));
    const code=await ff.exec(['-i','recorded.webm','-c:v','libx264','-preset',
      'ultrafast','-crf','26','-c:a','aac','-movflags','+faststart','ready.mp4'],-1);
    if(code!==0)throw new Error('MP4 codec not supported by this browser engine');
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    const data=await ff.readFile('ready.mp4');
    return new Blob([data],{type:'video/mp4'});
  }finally{
    ff.off('progress',progress);
    await ff.deleteFile('recorded.webm').catch(()=>{});
    await ff.deleteFile('ready.mp4').catch(()=>{});
  }
}
