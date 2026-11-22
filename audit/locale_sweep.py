import json,time,subprocess,urllib.request,base64
from pathlib import Path
from functools import partial
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import websocket
R=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
O=R/"audit"/"browser";O.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(("127.0.0.1",5326),partial(Quiet,directory=str(R/"dist")))
Thread(target=server.serve_forever,daemon=True).start()
chrome=subprocess.Popen([r"C:\Program Files\Google\Chrome\Application\chrome.exe","--headless=new","--disable-gpu","--remote-allow-origins=*","--remote-debugging-port=9256","--user-data-dir="+str(O/"profile_locale_9256"),"about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
ws=None;seq=0;errors=[];cases=[]
try:
 for attempt in range(40):
  try:
   pages=json.load(urllib.request.urlopen("http://127.0.0.1:9256/json",timeout=1))
   target=next(x for x in pages if x["type"]=="page")
   break
  except: time.sleep(.2)
 else:raise RuntimeError("Chrome CDP unavailable")
 ws=websocket.create_connection(target["webSocketDebuggerUrl"],timeout=24)
 def call(name,params=None):
  global seq
  seq+=1
  ws.send(json.dumps({"id":seq,"method":name,"params":params or {}}))
  while True:
   value=json.loads(ws.recv())
   if value.get("id")==seq:
    if "error" in value:raise RuntimeError(str(value["error"]))
    return value.get("result",{})
   if value.get("method") in ("Runtime.exceptionThrown","Inspector.targetCrashed"):
    errors.append(value)
 def ev(js):
  x=call("Runtime.evaluate",{"expression":js,"returnByValue":True,"awaitPromise":True})
  if x.get("exceptionDetails"):return {"error":x["exceptionDetails"]["text"]}
  return x.get("result",{}).get("value")
 call("Page.enable");call("Runtime.enable");call("Network.enable")
 call("Network.setCacheDisabled",{"cacheDisabled":True})
 call("Network.setBypassServiceWorker",{"bypass":True})
 for width,height in [(390,844),(320,640)]:
  call("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":True})
  for lang in ["en","fr","ar","es","de","pt","it"]:
   call("Page.navigate",{"url":"http://127.0.0.1:5326/?langtest="+lang+"&w="+str(width)})
   time.sleep(.43)
   ev("localStorage.setItem('rivo-language',"+json.dumps(lang)+")")
   call("Page.reload",{"ignoreCache":True})
   time.sleep(.9)
   ev("(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Got it')?.click();return true})()")
   ev("(()=>{document.querySelector('[data-tab=\"tools\"]')?.click();return true})()")
   time.sleep(.21)
   result=ev(r"""(()=>{
    const all=[...document.querySelectorAll('button,input,select,[role=button],[role=dialog]')].filter(e=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e);
     return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';
    }).map(e=>{const r=e.getBoundingClientRect();return {
     tag:e.tagName,name:(e.getAttribute('aria-label')||e.innerText||e.value||'').slice(0,65).trim(),
     x:r.x,right:r.right,width:r.width,height:r.height,disabled:!!e.disabled
    }});
    return {lang:document.documentElement.lang,dir:document.documentElement.dir,
     viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,
     horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
     elementsVisible:all.length,
     outOfBounds:all.filter(x=>x.x<(-3)||x.right>(innerWidth+3)).slice(0,18),
     toolTitles:[...document.querySelectorAll('button[data-hub-action]')].slice(0,8).map(x=>x.textContent.trim().slice(0,80))
    }
   })()""")
   result.update({"requested":lang,"width":width,"height":height,"environment":"Chrome emulation, no native Android"})
   cases.append(result)
   if (lang in ("ar","fr") and width==390) or (lang=="ar" and width==320):
    b=base64.b64decode(call("Page.captureScreenshot",{"format":"png"})["data"])
    (O/("locale_"+lang+"_"+str(width)+".png")).write_bytes(b)
   print(lang,width,result.get("lang"),result.get("dir"),"overflow",result.get("horizontalOverflow"),"offscreen",len(result.get("outOfBounds",[])),flush=True)
 report={"cases":cases,"chromeExceptions":errors,"source":"production dist from audit version 0.45.68; Chrome localized route smoke test",
 "notTested":"Native Android keyboard, camera, AdMob, Live dialogs and native RTL keyboard",
 "allLocaleDirectionsCorrect":all(r.get("dir")==("rtl" if r["requested"]=="ar" else "ltr") for r in cases)}
 (O/"locale_sweep.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
 print("SUMMARY",json.dumps({"total":len(cases),"overflow":sum(x.get("horizontalOverflow",False) for x in cases),
 "dirFailures":sum(x.get("dir")!=("rtl" if x["requested"]=="ar" else "ltr") for x in cases),
 "offscreenCases":sum(bool(x.get("outOfBounds")) for x in cases),"errors":len(errors)},ensure_ascii=False))
finally:
 if ws:
  try:ws.close()
  except:pass
 chrome.terminate()
 try:chrome.wait(timeout=3)
 except:chrome.kill()
 server.shutdown()
