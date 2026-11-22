import os,sys,json,time,subprocess,urllib.request,shutil
from pathlib import Path
import websocket,base64
ROOT=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
OUT=ROOT/"audit"/"browser";OUT.mkdir(exist_ok=True)
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT=9237
vite=subprocess.Popen(["node",str(ROOT/"node_modules"/"vite"/"bin"/"vite.js"),"--host","127.0.0.1","--port","5187","--strictPort"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(35):
 try:
  urllib.request.urlopen("http://127.0.0.1:5187/",timeout=.7);break
 except Exception:time.sleep(.2)
else:raise RuntimeError("Vite not reachable")
profile=OUT/"chrome-profile"
cmd=[CHROME,"--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-allow-origins=*","--remote-debugging-port="+str(PORT),"--user-data-dir="+str(profile),"about:blank"]
p=subprocess.Popen(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for i in range(35):
  try:
   pages=json.load(urllib.request.urlopen("http://127.0.0.1:"+str(PORT)+"/json",timeout=1))
   target=next(x for x in pages if x.get("type")=="page");break
  except Exception:time.sleep(.3)
 else:raise RuntimeError("Headless Chrome CDP endpoint never appeared")
 ws=websocket.create_connection(target["webSocketDebuggerUrl"],timeout=20)
 seq=0;events=[]
 def call(method,params=None):
  global seq
  seq+=1;ws.send(json.dumps({"id":seq,"method":method,"params":params or {}}))
  while True:
   r=json.loads(ws.recv())
   if r.get("id")==seq:
    if "error" in r:raise RuntimeError(str(r["error"]))
    return r.get("result",{})
   if r.get("method") in ("Runtime.exceptionThrown","Log.entryAdded","Inspector.targetCrashed"):
    events.append(r)
 def ev(js):
  r=call("Runtime.evaluate",{"expression":js,"returnByValue":True,"awaitPromise":True})
  if r.get("exceptionDetails"):return {"JS_ERROR":r["exceptionDetails"]["text"]}
  return r.get("result",{}).get("value")
 call("Page.enable");call("Runtime.enable");call("Log.enable")
 call("Emulation.setDeviceMetricsOverride",{"width":390,"height":844,"deviceScaleFactor":1,"mobile":True})
 call("Page.navigate",{"url":"http://127.0.0.1:5187/"})
 time.sleep(4)
 js=r"""(()=>({title:document.title,ready:document.readyState,url:location.href,body:document.body.className,
 buttons:[...document.querySelectorAll('button')].slice(0,65).map(x=>({text:(x.innerText||'').trim().slice(0,80),html:x.outerHTML.slice(0,260)})),
 dialogCount:document.querySelectorAll('[role=dialog]').length,
 nav:[...document.querySelectorAll('nav button,nav a')].map(x=>({text:x.textContent.trim(),html:x.outerHTML.slice(0,200)})),
 active:document.querySelector('#app')?.innerText?.slice(0,1200)
}))()"""
 result=ev(js)
 (OUT/"browser_discovery.json").write_text(json.dumps({"ui":result,"errors":events},ensure_ascii=False,indent=2),encoding="utf-8")
 shot=call("Page.captureScreenshot",{"format":"png","captureBeyondViewport":False})
 (OUT/"home_phone.png").write_bytes(base64.b64decode(shot["data"]))
 print(json.dumps({"title":result.get("title"),"button_count":len(result.get("buttons",[])),"nav":result.get("nav"),"text":result.get("active","")[:400],"errors":len(events),"screenshot":str(OUT/"home_phone.png")},ensure_ascii=False))
finally:
 try:ws.close()
 except:pass
 p.terminate()
 try:p.wait(timeout=3)
 except:p.kill()
 vite.terminate()
 try:vite.wait(timeout=3)
 except:vite.kill()
