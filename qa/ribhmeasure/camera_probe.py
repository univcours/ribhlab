import subprocess,time,re,xml.etree.ElementTree as E
from pathlib import Path
O=Path("qa-output");O.mkdir(exist_ok=True)
P="com.ribhlab.ribhmeasure"
def adb(*args,check=True):
 return subprocess.run(["adb",*args],capture_output=True,text=True,check=check,timeout=60).stdout
def cap(name):
 with (O/(name+".png")).open("wb") as f:subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,timeout=30)
 adb("shell","uiautomator","dump","/sdcard/rivo.xml",check=False)
 raw=adb("shell","cat","/sdcard/rivo.xml",check=False)
 (O/(name+".xml")).write_text(raw)
 return E.fromstring(raw)
def click_exact(tree,label):
 parents={c:p for p in tree.iter() for c in p}
 for n in tree.iter("node"):
  if n.get("text","").casefold()==label.casefold():
   while n.get("clickable")!="true" and n in parents:n=parents[n]
   x,y,X,Y=map(int,re.findall(r"\d+",n.get("bounds","")))
   adb("shell","input","tap",str((x+X)//2),str((y+Y)//2));return
 raise RuntimeError("Missing "+label)
try:
 adb("shell","settings","put","global","hide_error_dialogs","1")
 adb("shell","input","keyevent","82",check=False)
 time.sleep(5)
 camera=adb("shell","dumpsys","media.camera")
 (O/"camera.txt").write_text(camera)
 print("CAMERA TOPOLOGY:",*[l for l in camera.splitlines() if "ADD device" in l or "Camera device" in l or "maps to" in l],sep="\n",flush=True)
 print(adb("install","-r","arcore-emulator.apk"),flush=True)
 print(adb("install","-r","-g",str(next(Path("signed-artifacts").glob("*.apk")))),flush=True)
 adb("logcat","-c");adb("shell","am","start","-W","-n",P+"/.MainActivity");time.sleep(5)
 for i in range(4):
  tree=cap("home-"+str(i))
  if any(n.get("text","")=="Room scanner" for n in tree.iter("node")):break
  click_exact(tree,"Start room scan");time.sleep(5)
 tree=cap("ar")
 labels=[n.get("text","") for n in tree.iter("node") if n.get("text")]
 print("AR UI:",labels,flush=True)
 log=adb("logcat","-d")
 (O/"logcat.txt").write_text(log)
 assert any(t=="Room scanner" for t in labels),"AR screen not reached"
 assert not any("FatalException" in t or "could not start" in t for t in labels),"AR camera initialization failed"
 assert "Unable to retrieve camera characteristics for unknown device 0" not in log,"Camera 0 absent"
 assert any("Frame" in t or "surface" in t.lower() or "tracking" in t.lower() or "AUTO" in t for t in labels),"No AR state exposed"
 print("PASS: AR screen opened without known camera initialization failure; actual tracking/measurement still unverified",flush=True)
finally:
 (O/"final-camera.txt").write_text(adb("shell","dumpsys","media.camera",check=False))
 (O/"final-log.txt").write_text(adb("logcat","-d",check=False))
