import subprocess,urllib.request,json,time
from pathlib import Path
from functools import partial
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import websocket
R=Path(r'C:\Users\ram\AndroidStudioProjects\RivoScan-04567-FullUI');O=R/'audit'/'browser';O.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
srv=ThreadingHTTPServer(('127.0.0.1',5324),partial(Quiet,directory=str(R/'dist')))
Thread(target=srv.serve_forever,daemon=True).start()
chrome=subprocess.Popen([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless=new','--disable-gpu','--remote-allow-origins=*','--remote-debugging-port=9254','--user-data-dir='+str(O/'profile_stress_9254'),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
ws=None;seq=0;errs=[];cycles=[]
try:
 for _ in range(40):
  try:
   pages=json.load(urllib.request.urlopen('http://127.0.0.1:9254/json',timeout=1))
   page=next(x for x in pages if x.get('type')=='page');break
  except:time.sleep(.2)
 else:raise RuntimeError('Chrome target not found')
 ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=22)
 def call(name,args=None):
  global seq
  seq+=1;ws.send(json.dumps({'id':seq,'method':name,'params':args or {}}))
  while True:
   r=json.loads(ws.recv())
   if r.get('id')==seq:
    if 'error' in r:raise RuntimeError(str(r['error']))
    return r.get('result',{})
   if r.get('method') in ('Runtime.exceptionThrown','Inspector.targetCrashed'):errs.append(r)
 def ev(js):
  r=call('Runtime.evaluate',{'expression':js,'returnByValue':True,'awaitPromise':True})
  return r.get('result',{}).get('value')
 call('Page.enable');call('Runtime.enable');call('Performance.enable')
 call('Network.enable');call('Network.setCacheDisabled',{'cacheDisabled':True})
 call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
 call('Page.navigate',{'url':'http://127.0.0.1:5324/?adversarial=1'});time.sleep(2.5)
 ev("(()=>{document.querySelector('[data-tab=\"tools\"]')?.click();return true})()")
 for tool in ['bookScan','idPhotoMaker']:
  for ix in range(25):
   ev("(()=>{document.querySelector('[data-hub-action="+json.dumps(tool)+"]')?.click();return true})()")
   time.sleep(.035)
   result=ev("(()=>{let p=document.querySelector('.rivo-id-overlay');return {opened:!!p,enabledButtons:p?[...p.querySelectorAll('button:not(:disabled):not([hidden])')].length:0}})()")
   after=ev("(()=>{let b=document.querySelector('.rivo-id-overlay [data-rivo-modal-close]');b?.click();return {closed:!document.querySelector('.rivo-id-overlay'),buttons:[...document.querySelectorAll('button[data-hub-action]')].length}})()")
   if ix%5==0:time.sleep(.035)
   cycles.append({'tool':tool,'cycle':ix+1,'opened':result.get('opened'), 'closed':after.get('closed'), 'hubButtonsAfterClose':after.get('buttons')})
  print(tool,'CYCLES',25,'FAILURES',sum((not x['opened'] or not x['closed']) for x in cycles if x['tool']==tool),flush=True)
 counters=call('Memory.getDOMCounters')
 metrics=call('Performance.getMetrics')
 summary={'environment':'Chrome synthetic click cycles, not Android','cycles':len(cycles),
 'openErrors':sum(not x['opened'] for x in cycles),'closeErrors':sum(not x['closed'] for x in cycles),
 'JSExceptions':len(errs),'DOMCounters':counters,'JSHeapMetrics':{x['name']:x['value'] for x in metrics.get('metrics',[]) if x['name'] in ('JSHeapUsedSize','Nodes','Documents','JSEventListeners')},
 'cases':cycles}
 (O/'adversarial_open_close.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
 print('STRESS_SUMMARY',json.dumps({k:v for k,v in summary.items() if k!='cases'},ensure_ascii=False))
finally:
 if ws:
  try:ws.close()
  except:pass
 chrome.terminate()
 try:chrome.wait(timeout=3)
 except:chrome.kill()
 srv.shutdown()
