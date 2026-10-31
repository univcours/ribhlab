/**
 * RivoScan P2P beta: direct, encrypted WebRTC data channel.
 * Manual offer/answer exchange avoids a signaling server.
 * Does not provide NAT traversal relays: some networks will not connect.
 */
const MAX_SINGLE = 15 * 1024 * 1024;
const MAX_TOTAL = 60 * 1024 * 1024;
const CHUNK = 16 * 1024;

const safeName = name => String(name || 'received-file')
  .replace(/[\\/\x00-\x1f<>:"|?*]/g, '_').slice(0, 120) || 'received-file';
function encodeSignal(desc) {
  const bytes = new TextEncoder().encode(JSON.stringify({type: desc.type, sdp:desc.sdp}));
  let binary = '';
  for(let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
function decodeSignal(str) {
  const text = new TextDecoder().decode(Uint8Array.from(atob(str.trim().replace(/\s/g,'')),c=>c.charCodeAt(0)));
  const parsed=JSON.parse(text);
  if(!['offer','answer'].includes(parsed.type) || typeof parsed.sdp !== 'string' || parsed.sdp.length > 100000) throw Error('Invalid connection code.');
  return parsed;
}
function waitForIce(pc) {
  if(pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{cleanup(); reject(Error('Network discovery timed out. Try again on the same Wi-Fi network.'));},20000);
    function cleanup(){clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',onChange)}
    function onChange(){if(pc.iceGatheringState==='complete'){cleanup();resolve()}}
    pc.addEventListener('icegatheringstatechange',onChange);
  });
}
function waitDrain(channel) {
  if(channel.bufferedAmount <= 256*1024) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{cleanup();reject(Error('Peer is not receiving data.'));},30000);
    function cleanup(){clearTimeout(timeout);channel.removeEventListener('bufferedamountlow',onLow);channel.removeEventListener('close',onClose)}
    function onLow(){if(channel.bufferedAmount<=256*1024){cleanup();resolve()}}
    function onClose(){cleanup();reject(Error('Peer disconnected.'))}
    channel.bufferedAmountLowThreshold=128*1024;
    channel.addEventListener('bufferedamountlow',onLow);channel.addEventListener('close',onClose);
  });
}
export function initPeerTransfer({onReceive,notify}){
  if(typeof RTCPeerConnection === 'undefined'){
    const s=document.getElementById('peer-status');if(s)s.textContent='This device does not support WebRTC file transfer.';
    return ()=>{};
  }
  const find=id=>document.getElementById(id);
  let pc=null,channel=null,pending=null,disconnected=false,sendInProgress=false;
  let totalReceived=0;
  const status=s=>{const el=find('peer-status');if(el)el.textContent=s};
  const buttons=()=>{const connected=channel?.readyState==='open';const send=find('peer-send');if(send)send.disabled=!connected||sendInProgress;};
  const cleanup=()=>{disconnected=true;try{channel?.close()}catch{}try{pc?.close()}catch{}channel=null;pc=null;pending=null;buttons()};
  const setup=()=>{
    cleanup();disconnected=false;totalReceived=0;
    pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    pc.addEventListener('connectionstatechange',()=>{
      status(pc?.connectionState==='connected'?'Connected securely — ready to exchange files.':
        'Connection: '+(pc?.connectionState||'closed'));
      buttons();
    });
    pc.addEventListener('datachannel',evt=>setChannel(evt.channel));
    return pc;
  };
  function setChannel(ch){
    channel=ch;channel.binaryType='arraybuffer';
    channel.onopen=()=>{status('Connected securely — choose a file and Send.');buttons()};
    channel.onclose=()=>{status('Peer connection closed.');buttons()};
    channel.onerror=()=>status('Data channel error; try pairing again.');
    channel.onmessage=async evt=>{
      try{
        if(typeof evt.data === 'string'){
          const msg=JSON.parse(evt.data);
          if(msg.type!=='file'||!Number.isSafeInteger(msg.size)||msg.size<0||msg.size>MAX_SINGLE||
             typeof msg.name!=='string'||msg.name.length>255) throw Error('Invalid incoming file metadata.');
          if(pending)throw Error('Incoming file stream was interrupted.');
          if(totalReceived+msg.size>MAX_TOTAL)throw Error('Transfer exceeds 60 MB receive limit.');
          pending={name:safeName(msg.name),mime:msg.mime||'application/octet-stream',size:msg.size,parts:[],received:0};
          status('Receiving '+pending.name+' (0%)');
          if(msg.size===0)await finishIncoming();
          return;
        }
        if(!pending)throw Error('Unexpected incoming data.');
        const chunk=evt.data instanceof ArrayBuffer?new Uint8Array(evt.data):
          new Uint8Array(await evt.data.arrayBuffer());
        if(pending.received+chunk.byteLength>pending.size)throw Error('Received more bytes than expected.');
        pending.parts.push(chunk);pending.received+=chunk.byteLength;
        status('Receiving '+pending.name+' ('+Math.round(pending.received/Math.max(1,pending.size)*100)+'%)');
        if(pending.received===pending.size)await finishIncoming();
      }catch(err){pending=null;status('Receive failed: '+err.message);notify?.(err.message,true)}
    };
  }
  async function finishIncoming(){
    const f=pending;pending=null;totalReceived+=f.size;
    const bytes=new Uint8Array(f.size);let pos=0;
    for(const part of f.parts){bytes.set(part,pos);pos+=part.length}
    await onReceive(bytes,f.name,f.mime);
    status('Received '+f.name+'. Ready for another file.');
  }
  const copyBtn=find('peer-copy'),startBtn=find('peer-offer'),answerBtn=find('peer-answer'),connectBtn=find('peer-connect'),sendBtn=find('peer-send');
  startBtn?.addEventListener('click',async()=>{
    try{
      const connection=setup();
      setChannel(connection.createDataChannel('rivoscan',{ordered:true}));
      await connection.setLocalDescription(await connection.createOffer());
      status('Preparing connection code…');await waitForIce(connection);
      find('peer-local').value=encodeSignal(connection.localDescription);
      status('Send this offer code to the receiver; paste their answer below.');
    }catch(err){status('Could not create invitation: '+err.message)}
  });
  answerBtn?.addEventListener('click',async()=>{
    try{
      const remote=decodeSignal(find('peer-remote').value);
      if(remote.type!=='offer')throw Error('Paste a sender offer code here.');
      const connection=setup();await connection.setRemoteDescription(remote);
      await connection.setLocalDescription(await connection.createAnswer());
      status('Preparing answer code…');await waitForIce(connection);
      find('peer-local').value=encodeSignal(connection.localDescription);
      status('Send this answer code back to the sender. Connection starts after they paste it.');
    }catch(err){status('Could not accept invitation: '+err.message)}
  });
  connectBtn?.addEventListener('click',async()=>{
    try{
      if(!pc || pc.signalingState!=='have-local-offer')throw Error('Create an offer first.');
      const remote=decodeSignal(find('peer-remote').value);
      if(remote.type!=='answer')throw Error('Paste the receiver answer code.');
      await pc.setRemoteDescription(remote);
      status('Connecting to the other device…');
    }catch(err){status('Could not connect: '+err.message)}
  });
  copyBtn?.addEventListener('click',async()=>{
    const code=find('peer-local')?.value;
    if(!code)return;
    try{await navigator.clipboard.writeText(code);status('Code copied. Share it privately with the other person.')}
    catch{find('peer-local').focus();find('peer-local').select();status('Select the code and copy it manually.')}
  });
  sendBtn?.addEventListener('click',async()=>{
    const selected=[...(find('peer-files')?.files||[])];
    if(!selected.length){notify?.('Choose one or more files first.',true);return}
    if(!channel||channel.readyState!=='open'){notify?.('Connect to the receiver first.',true);return}
    if(selected.some(f=>f.size>MAX_SINGLE)||selected.reduce((s,f)=>s+f.size,0)>MAX_TOTAL){
      notify?.('Max 15 MB per file and 60 MB per batch.',true);return
    }
    sendInProgress=true;buttons();
    try{
      for(const f of selected){
        channel.send(JSON.stringify({type:'file',name:safeName(f.name),size:f.size,mime:f.type||'application/octet-stream'}));
        const arr=new Uint8Array(await f.arrayBuffer());
        for(let p=0;p<arr.length;p+=CHUNK){
          if(channel.readyState!=='open')throw Error('Peer disconnected.');
          await waitDrain(channel);
          channel.send(arr.slice(p,p+CHUNK));
          status('Sending '+f.name+' ('+Math.round((p+Math.min(CHUNK,arr.length-p))/Math.max(1,arr.length)*100)+'%)');
        }
      }
      status('File data sent. Receiver is saving the files.');
    }catch(err){status('Transfer interrupted: '+err.message);notify?.(err.message,true)}
    finally{sendInProgress=false;buttons()}
  });
  buttons();
  return cleanup;
}
