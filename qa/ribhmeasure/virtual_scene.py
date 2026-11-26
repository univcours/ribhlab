import subprocess,time,re,struct,os,xml.etree.ElementTree as ET
from pathlib import Path
import grpc
P="com.ribhlab.ribhmeasure"
O=Path("qa-output");O.mkdir(exist_ok=True)
def adb(*args,check=True):
 r=subprocess.run(["adb",*args],capture_output=True,text=True,check=check,timeout=50)
 return r.stdout
def cap(name):
 with (O/(name+".png")).open("wb") as f:subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,check=False,timeout=25)
 (O/(name+"-activity.txt")).write_text(adb("shell","dumpsys","activity","activities",check=False),encoding="utf-8")
 (O/(name+"-log.txt")).write_text(adb("logcat","-d","-s","AndroidRuntime:E","RoomAR:E","RoomDepth:W",check=False),encoding="utf-8")
 try:
  adb("shell","uiautomator","dump","/sdcard/rivo.xml")
  raw=adb("shell","cat","/sdcard/rivo.xml");(O/(name+".xml")).write_text(raw,encoding="utf-8")
  return list(ET.fromstring(raw).iter("node"))
 except Exception as e:
  print("UI dump",type(e).__name__,flush=True);return []
def tap(n):
 x1,y1,x2,y2=map(int,re.findall(r"\d+",n.get("bounds","")));adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2));time.sleep(1.3)
def open_scan():
 for i in range(4):
  ns=cap("scan-launch-"+str(i))
  if any("Room scanner" in n.get("text","") for n in ns):return
  raw=(O/("scan-launch-"+str(i)+".xml")).read_text()
  root=ET.fromstring(raw);parents={c:p for p in root.iter() for c in p}
  target=next((n for n in root.iter("node") if n.get("text")=="Start room scan"),None)
  if target is None:time.sleep(2);continue
  while target.get("clickable")!="true" and target in parents:target=parents[target]
  tap(target)
 raise AssertionError("Room scanner did not open after tapping its clickable container")
def find(label,tag,scroll=False):
 for i in range(6):
  ns=cap(tag+"-"+str(i))
  print("UI",[(n.get("text"),n.get("content-desc")) for n in ns if n.get("text") or n.get("content-desc")],flush=True)
  for n in ns:
   if any(label.casefold() in (n.get(k) or "").casefold() for k in ("text","content-desc")):return n
  if scroll and i%2==0:
   w,h=map(int,re.findall(r"(\d+)x(\d+)",adb("shell","wm","size"))[-1]);adb("shell","input","swipe",str(w//2),str(int(h*.78)),str(w//2),str(int(h*.35)),"400")
  time.sleep(1)
 raise AssertionError("Missing UI label: "+label)
def launch():
 adb("shell","am","force-stop",P)
 print(adb("shell","am","start","-W","-n",P+"/.MainActivity"),flush=True);time.sleep(3)
def field(label,value):
 tap(find(label,"field-"+label.replace(" ","-")));adb("shell","input","text",value);time.sleep(.3)
def status(s):print(s,flush=True)
def xyz(x=0,y=0,z=0):
 return b"".join(bytes([13+8*i])+struct.pack("<f",float(v)) for i,v in enumerate([x,y,z]))
def virtual_motion():
 channel=grpc.insecure_channel("127.0.0.1:8554")
 prefix="/android.emulation.control.EmulatorController/"
 rot=channel.unary_unary(prefix+"rotateVirtualSceneCamera")
 vel=channel.unary_unary(prefix+"setVirtualSceneCameraVelocity")
 try:
  rot(xyz(x=-.35),timeout=10)
  for i in range(8):
   vel(xyz(x=.20 if i%2==0 else -.20),timeout=8);time.sleep(1.8)
   vel(xyz(),timeout=8);rot(xyz(y=.72),timeout=8);time.sleep(1.8)
   nodes=cap("ar-move-"+str(i));status("AR SAMPLE "+str(i)+" "+str([n.get("text") for n in nodes if n.get("text")]))
 finally:
  try:vel(xyz(),timeout=5)
  except Exception:pass
  channel.close()
fail=[]
try:
 # These settings only affect the disposable hosted emulator.
 adb("shell","settings","put","global","hide_error_dialogs","1")
 adb("shell","am","force-stop","com.google.android.apps.nexuslauncher",check=False)
 adb("shell","am","force-stop","com.android.launcher3",check=False)
 adb("shell","input","keyevent","82",check=False)
 adb("shell","wm","size","reset");adb("shell","wm","density","reset")
 apk=next(Path("signed-artifacts").glob("*.apk"))
 status(adb("install","-r","-g",str(apk)))
 status(adb("install","-r","arcore-emulator.apk"))
 status(adb("shell","dumpsys","package","com.google.ar.core").split("versionName=")[-1].splitlines()[0]); camera=adb("shell","dumpsys","media.camera");(O/"camera-topology.txt").write_text(camera,encoding="utf-8");status("CAMERA TOPOLOGY "+str([l.strip() for l in camera.splitlines() if "maps to" in l or "Number of camera devices" in l]))
 adb("logcat","-c");status("PASS: signed APK and official ARCore installed")
 try:
  launch();find("RivoMeasure","home");find("Start room scan","scan-entry");status("PASS: home and scan entry")
  tap(find("Room plan","manual-entry",scroll=True));field("Length (m)","5");field("Width (m)","4");field("Height (m)","2.8")
  adb("shell","input","keyevent","4");find("20.00","area",scroll=True);find("56.00","volume",scroll=True);status("PASS: manual area and volume")
  tap(find("2D / 3D / PDF","plan",scroll=True));find("20.00","plan-area");tap(find("3D","3d-entry"));find("3D room","3d");status("PASS: 3D screen")
 except Exception as e:fail.append("UI: "+str(e));status("FAIL: "+fail[-1])
 try:
  launch();open_scan();find("Room scanner","ar-screen");time.sleep(5); nodes=cap("ar-preflight"); labels=[n.get("text","") for n in nodes];status("AR PRECHECK "+str(labels));
  if any("AR camera could not start" in t or "FatalException" in t for t in labels):raise AssertionError("ARCore session failed before movement; see camera topology and log")
  status("PASS: AR activity opened")
  virtual_motion()
  texts=[]
  for f in O.glob("ar-move-*.xml"):
   texts.extend(n.get("text","") for n in ET.fromstring(f.read_text()).iter("node"))
  if any(re.search(r"Camera.*surface.*\d+\.\d+ m",t) for t in texts):status("PASS: observed nonempty AR distance during virtual motion")
  else:raise AssertionError("No measured AR distance observed in sampled UI")
 except Exception as e:fail.append("AR: "+str(e));status("FAIL: "+fail[-1])
finally:cap("final")
if fail:raise SystemExit("; ".join(fail))
status("All virtual smoke checks passed; physical accuracy and full room geometry still unverified.")
