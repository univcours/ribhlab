import os,json,time,subprocess,urllib.request,base64
from pathlib import Path
import websocket
ROOT=Path(r"C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI")
OUT=ROOT/"audit"/"browser";OUT.mkdir(parents=True,exist_ok=True)
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe";PORT=9251
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
server=ThreadingHTTPServer(("127.0.0.1",5322),partial(SimpleHTTPRequestHandler,directory=str(ROOT/"dist")))
Thread(target=server.serve_forever,daemon=True).start()
chrome=subprocess.Popen([CHROME,"--headless=new","--disable-gpu","--remote-allow-origins=*","--remote-debugging-port="+str(PORT),"--user-data-dir="+str(OUT/"profile_9251_fresh"),"about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
ws=None;seq=0;errors=[];captures={};navproof=[]
try:
 for _ in range(40):
  try:
   pages=json.load(urllib.request.urlopen("http://127.0.0.1:"+str(PORT)+"/json",timeout=1))
   target=next(x for x in pages if x.get("type")=="page");break
  except:time.sleep(.25)
 else:raise RuntimeError("Chrome CDP not running")
 ws=websocket.create_connection(target["webSocketDebuggerUrl"],timeout=25)
 def call(name,args=None):
  global seq
  seq+=1;ws.send(json.dumps({"id":seq,"method":name,"params":args or {}}))
  while True:
   r=json.loads(ws.recv())
   if r.get("id")==seq:
    if "error" in r:raise RuntimeError(str(r["error"]))
    return r.get("result",{})
   if r.get("method") in ("Runtime.exceptionThrown","Log.entryAdded","Inspector.targetCrashed"):errors.append(r)
 def ev(code):
  r=call("Runtime.evaluate",{"expression":code,"awaitPromise":True,"returnByValue":True,"silent":False})
  if r.get("exceptionDetails"):return {"error":r["exceptionDetails"].get("text")}
  return r.get("result",{}).get("value")
 def shot(name):
  png=base64.b64decode(call("Page.captureScreenshot",{"format":"png","captureBeyondViewport":False})["data"])
  (OUT/(name+".png")).write_bytes(png);return len(png)
 def probe(name):
  data=ev(r"""(()=>({
   title:document.title,url:location.href,body:document.body.className,
   text:(document.querySelector('#app')?.innerText||document.body.innerText||'').slice(0,2500),
   buttons:[...document.querySelectorAll('button')].filter(x=>{let r=x.getBoundingClientRect();return r.width>0&&r.height>0}).map(x=>({text:(x.innerText||x.getAttribute('aria-label')||'').trim().slice(0,65),class:x.className,attrs:[...x.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value),disabled:x.disabled,rect:(r=>({x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}))(x.getBoundingClientRect())})),
   dialogs:[...document.querySelectorAll('[role=dialog],dialog,.rivo-id-overlay,.rivo-code-overlay')].filter(x=>x.getBoundingClientRect().height>0).map(x=>({class:x.className,hidden:x.hidden,rect:(r=>({x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}))(x.getBoundingClientRect())})),
   overflowX:document.documentElement.scrollWidth>window.innerWidth+1,
   viewport:{width:innerWidth,height:innerHeight}
  }))()""")
  data["screenshot"]=name+".png";data["size"]=shot(name);captures[name]=data
  print(name,"buttons",len(data.get("buttons",[])),"dialogs",len(data.get("dialogs",[])),"xoverflow",data.get("overflowX"))
  return data
 def click(expr,wait=.5):
  r=ev(expr);time.sleep(wait);return r
 call("Page.enable");call("Runtime.enable");call("Log.enable");call("Network.enable");call("Network.setCacheDisabled",{"cacheDisabled":True});call("Network.setBypassServiceWorker",{"bypass":True})
 call("Emulation.setDeviceMetricsOverride",{"width":390,"height":844,"deviceScaleFactor":1,"mobile":True})
 call("Page.navigate",{"url":"http://127.0.0.1:5322/?audit_fresh=20261122_04568"});time.sleep(2.5)
 probe("00_initial_whatnew")
 click("(()=>{let b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Got it');if(b)b.click();return !!b})()",.5)
 probe("01_home")
 click("(()=>{let b=document.querySelector('[data-tab=\"tools\"]');if(b)b.click();return !!b})()",.6)
 p=probe("02_tools")
 print("TOOLS_BUTTONS",json.dumps(p.get("buttons",[])[:35],ensure_ascii=False)[:3800])
 # Click the real ID Photos tile if one is visible
 click("(()=>{let b=document.querySelector('[data-hub-tool=\"idPhotoMaker\"],[data-hub-id=\"idPhotoMaker\"],[data-tool=\"idPhotoMaker\"]');if(!b)b=[...document.querySelectorAll('button')].find(x=>/ID Photos for Print|ID Photo Maker/.test(x.textContent));if(b)b.click();return b?.outerHTML.slice(0,200)||'NOT FOUND'})()",.65)
 p=probe("03_id_photo")
 print("ID_PHOTO_COMPONENTS",json.dumps({"dialogs":p.get("dialogs"),"buttons":p.get("buttons",[])[:25]},ensure_ascii=False)[:2700])
 # Check simulated Android-safe layout and disabled/hidden components
 visibility=ev(r"""(()=>{
  document.body.classList.add('rivo-native-android');
  document.documentElement.style.setProperty('--rivo-content-bottom','165px');
  let ov=document.querySelector('.rivo-id-overlay');
  return {overlayExists:!!ov,overlap:ov?ov.getBoundingClientRect().bottom>innerHeight-165+2:null,
   overlayBottom:ov?.getBoundingClientRect().bottom,viewportBottom:innerHeight-165,
   textBehindImport:!!document.querySelector('.rivo-workspace-empty:not([hidden])'),
   emptyHiddenProperty:document.querySelector('.rivo-workspace-empty')?.hidden,
   emptyComputedDisplay:document.querySelector('.rivo-workspace-empty')?getComputedStyle(document.querySelector('.rivo-workspace-empty')).display:null,
   inputVisible:document.querySelector('.rivo-id-native-file-picker')?getComputedStyle(document.querySelector('.rivo-id-native-file-picker')).display:null
  }
 })()""")
 print("ID_NATIVE_SIMULATION",json.dumps(visibility))
 captures["03_id_photo"]["native_simulation"]=visibility
 shot("04_id_photo_simulated_native")
 click("(()=>{let x=document.querySelector('.rivo-id-overlay button[data-rivo-modal-close],.rivo-id-overlay .rivo-modal-dismiss,.rivo-id-overlay button[aria-label=\"Close\"]');if(!x)x=[...document.querySelectorAll('.rivo-id-overlay button')].find(x=>/Close|×|✕/.test(x.textContent));if(x)x.click();return !!x})()",.5)
 # Probe documents and personal page via bottom nav
 for name,selector in [("05_documents","[data-open-library]"),("06_me","[data-tab=\"me\"]"),("07_tools_return","[data-tab=\"tools\"]")]:
  click("(()=>{let b=document.querySelector("+json.dumps(selector)+");if(b)b.click();return !!b})()",.5)
  probe(name)
 # Try book scan
 click("(()=>{let b=[...document.querySelectorAll('button')].find(x=>/Scan Book Pages|Book Scan/i.test(x.textContent));if(b)b.click();return b?.outerHTML.slice(0,200)||'NOT FOUND'})()",.5)
 probe("08_book_scan")
 for label,w,h in [("09_book_narrow",320,640),("10_book_large_phone",412,915),("11_book_landscape",844,390),("12_book_tablet",768,1024)]:
  call("Emulation.setDeviceMetricsOverride",{"width":w,"height":h,"deviceScaleFactor":1,"mobile":True})
  ev("(()=>{document.body.classList.add('rivo-native-android');document.documentElement.style.setProperty('--rivo-content-bottom','165px');return true})()")
  time.sleep(.15)
  rec=probe(label)
  rec["nativeBannerBoundary"]=ev("(()=>{let x=document.querySelector('.rivo-id-overlay');return x?{bottom:x.getBoundingClientRect().bottom,limit:innerHeight-165,overlap:x.getBoundingClientRect().bottom>innerHeight-163}:null})()")
 call("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-color-scheme","value":"dark"}]})
 probe("13_book_prefers_dark")
 call("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-color-scheme","value":"light"}]})
 probe("14_book_prefers_light")
 (OUT/"browser_navigation_audit.json").write_text(json.dumps({"screens":captures,"runtimeErrors":errors,"idPhotoNativeSimulation":visibility,"environment":"Chromium mobile emulation, not real Android"},indent=2,ensure_ascii=False),encoding="utf8")
 print("SUMMARY",json.dumps({"screens":list(captures),"errors":len(errors),"native_simulation":visibility,"numScreens":len(captures)},ensure_ascii=False))
finally:
 if ws:
  try:ws.close()
  except:pass
 for p in [chrome]:
  p.terminate()
  try:p.wait(timeout=3)
  except:p.kill()
 server.shutdown()
