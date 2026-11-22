import json,time,subprocess,urllib.request,base64,datetime
from pathlib import Path
from functools import partial
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import websocket
R=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
O=R/"audit"/"browser";O.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=ThreadingHTTPServer(("127.0.0.1",5323),partial(Quiet,directory=str(R/"dist")))
Thread(target=srv.serve_forever,daemon=True).start()
chrome=subprocess.Popen([r"C:\Program Files\Google\Chrome\Application\chrome.exe","--headless=new","--disable-gpu","--remote-allow-origins=*","--remote-debugging-port=9253","--user-data-dir="+str(O/"profile_sweep_9253"),"about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
ws=None;seq=0;errors=[];entries=[]
try:
 for _ in range(40):
  try:
   pages=json.load(urllib.request.urlopen("http://127.0.0.1:9253/json",timeout=1))
   target=next(x for x in pages if x["type"]=="page");break
  except:time.sleep(.2)
 else:raise RuntimeError("Chrome no CDP")
 ws=websocket.create_connection(target["webSocketDebuggerUrl"],timeout=22)
 def call(method,params=None):
  global seq
  seq+=1;ws.send(json.dumps({"id":seq,"method":method,"params":params or {}}))
  while True:
   r=json.loads(ws.recv())
   if r.get("id")==seq:
    if "error" in r:raise RuntimeError(str(r["error"]))
    return r.get("result",{})
   if r.get("method") in ("Runtime.exceptionThrown","Log.entryAdded","Inspector.targetCrashed"):errors.append(r)
 def ev(code):
  r=call("Runtime.evaluate",{"expression":code,"returnByValue":True,"awaitPromise":True})
  return r.get("result",{}).get("value")
 call("Page.enable");call("Runtime.enable");call("Network.enable");call("Log.enable")
 call("Network.setCacheDisabled",{"cacheDisabled":True});call("Network.setBypassServiceWorker",{"bypass":True})
 for width,height in [(390,844),(320,640)]:
  call("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":True})
  call("Page.navigate",{"url":"http://127.0.0.1:5323/?sweep="+str(width)});time.sleep(1.4)
  ev("(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Got it')?.click();return true})()")
  ev("(()=>{document.querySelector('[data-tab=\"tools\"]')?.click();return true})()")
  time.sleep(.35)
  actions=ev("([...document.querySelectorAll('button[data-hub-action]')].map(x=>({key:x.dataset.hubAction,text:x.innerText.trim()})))")
  if not actions:raise RuntimeError("No tools in DOM")
  for index,tool in enumerate(actions):
   before=len(errors)
   key=tool["key"]
   ev("(()=>{document.body.classList.add('rivo-native-android');document.documentElement.style.setProperty('--rivo-content-bottom','165px');return true})()")
   clicked=ev("(()=>{let t=[...document.querySelectorAll('button[data-hub-action]')].find(x=>x.dataset.hubAction==="+json.dumps(key)+");if(t)t.click();return !!t})()")
   time.sleep(.25)
   data=ev("""(()=>{document.body.classList.add('rivo-native-android');document.documentElement.style.setProperty('--rivo-content-bottom','165px');
    let candidates=[...document.querySelectorAll('.rivo-id-overlay,.rivo-code-overlay,.rivo-live-overlay,.rivo-plate-overlay,.rivo-merged-overlay,.rivo-editor-overlay,.rivo-page-manager-overlay,.rivo-pages-overlay,.rivo-shield-overlay,.rivo-perfectscan-overlay,.rivo-release-overlay,.doc-detail-overlay,.bulk-overlay,[role=dialog]')].filter(x=>{let r=x.getBoundingClientRect();return r.width>0&&r.height>0});
    let seen=[];for(let x of candidates){if(seen.some(y=>y.contains(x)))continue;seen.push(x)}
    return {viewport:[innerWidth,innerHeight],overlay:seen.map(x=>{let r=x.getBoundingClientRect(),cs=getComputedStyle(x);return {className:String(x.className),bottom:r.bottom,top:r.top,height:r.height,scrollHeight:x.scrollHeight,overflow:cs.overflowY,borderRadius:cs.borderRadius,bannerOverlap:r.bottom>innerHeight-163}}),
    visibleDialogs:[...document.querySelectorAll('[role=dialog]')].filter(x=>x.getBoundingClientRect().height>0).length,
    visibleButtons:[...document.querySelectorAll('button')].filter(x=>{let r=x.getBoundingClientRect();return r.width>0&&r.height>0}).length,
    visibleText:(document.body.innerText||'').slice(-340),url:location.href}
   })()""")
   item={"toolId":key,"label":tool["text"],"viewport":str(width)+"x"+str(height),"clicked":clicked,"result":data,
     "JSExceptions":len(errors)-before,"status":"NOT TESTED" if not clicked else "BROWSER-OPENED"}
   if data and any(x["bannerOverlap"] for x in data.get("overlay",[])):item["status"]="FAIL_BANNER_OVERLAP"
   elif data and data.get("overlay"):item["status"]="UI_OPENED_BROWSER_ONLY"
   else:item["status"]="NO_DIALOG_BROWSER_ONLY"
   entries.append(item)
   # Escape if a dialog is open, then restore the Tools view after every tool
   ev("(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return true})()")
   time.sleep(.08)
   ev("(()=>{let selectors=['.rivo-id-overlay .rivo-modal-dismiss','.rivo-code-overlay .rivo-modal-dismiss','button[data-rivo-modal-close]'];for(let s of selectors){let b=document.querySelector(s);if(b){b.click();break}}return true})()")
   time.sleep(.08)
   # Re-navigate for perfect isolation (prevents one modal masking the next)
   call("Page.navigate",{"url":"http://127.0.0.1:5323/?sweep="+str(width)+"-"+str(index)});time.sleep(.14)
   ev("(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Got it')?.click();document.querySelector('[data-tab=\"tools\"]')?.click();return true})()")
   time.sleep(.06)
   print(width,key,item["status"],"exceptions",item["JSExceptions"],flush=True)
 output={"environment":"Chrome mobile emulation; native AdMob/Android APIs unavailable","source_commit":subprocess.check_output(["git","rev-parse","HEAD"],cwd=R,text=True).strip(),"entries":entries,"runtimeExceptions":errors}
 (O/"modal_sweep.json").write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding="utf8")
 print("AUDIT_SUMMARY",json.dumps({"cases":len(entries),"counts":{x:sum(i["status"]==x for i in entries) for x in sorted(set(i["status"] for i in entries))},"exceptions":len(errors)},ensure_ascii=False))
finally:
 if ws:
  try:ws.close()
  except:pass
 chrome.terminate()
 try:chrome.wait(timeout=3)
 except:chrome.kill()
 srv.shutdown()
