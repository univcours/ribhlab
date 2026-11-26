import subprocess,time,re,struct,xml.etree.ElementTree as ET
from pathlib import Path
import grpc
P="com.ribhlab.ribhmeasure"
O=Path("qa-output");O.mkdir(exist_ok=True)
def adb(*args,check=True):
 return subprocess.run(["adb",*args],capture_output=True,text=True,check=check,timeout=45).stdout
def cap(name):
 with (O/(name+".png")).open("wb") as f:subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,timeout=25)
 adb("shell","uiautomator","dump","/sdcard/rivo.xml",check=False)
 raw=adb("shell","cat","/sdcard/rivo.xml",check=False);(O/(name+".xml")).write_text(raw)
 root=ET.fromstring(raw);labels=[n.get("text","") for n in root.iter("node") if n.get("text")]
 print(name,labels,flush=True)
 return root,labels
def click(tree,label):
 parents={c:p for p in tree.iter() for c in p}
 n=next(n for n in tree.iter("node") if n.get("text","").casefold()==label.casefold())
 while n.get("clickable")!="true" and n in parents:n=parents[n]
 x,y,X,Y=map(int,re.findall(r"\d+",n.get("bounds","")))
 adb("shell","input","tap",str((x+X)//2),str((y+Y)//2));time.sleep(1)
def xyz(x=0,y=0,z=0):return b"".join(bytes([13+8*i])+struct.pack("<f",float(v)) for i,v in enumerate([x,y,z]))
def status(t):print(t,flush=True)
def move(x=0,y=0,z=0,seconds=2):
 vel(xyz(x,y,z),timeout=10);time.sleep(seconds);vel(xyz(),timeout=10);time.sleep(1)
def turn(x=0,y=0,z=0):
 rot(xyz(x,y,z),timeout=10);time.sleep(.8)
def positive(labels):return any(re.search(r"Camera.*surface.*\b[0-9]+\.[0-9]+ m",s) for s in labels)
channel=grpc.insecure_channel("127.0.0.1:8554")
prefix="/android.emulation.control.EmulatorController/"
rot=channel.unary_unary(prefix+"rotateVirtualSceneCamera")
vel=channel.unary_unary(prefix+"setVirtualSceneCameraVelocity")
measurements=[]; maxcorners=0
try:
 adb("shell","settings","put","global","hide_error_dialogs","1")
 adb("shell","input","keyevent","82",check=False);time.sleep(5)
 camera=adb("shell","dumpsys","media.camera");(O/"camera.txt").write_text(camera);status("CAMERAS "+str([l.strip() for l in camera.splitlines() if "maps to" in l]))
 status(adb("install","-r","arcore-emulator.apk"));status(adb("install","-r","-g",str(next(Path("signed-artifacts").glob("*.apk")))))
 adb("logcat","-c")
 adb("shell","am","start","-W","-n",P+"/.MainActivity");time.sleep(5)
 for i in range(5):
  tree,labels=cap("home-"+str(i))
  if "Room scanner" in labels:break
  click(tree,"Start room scan");time.sleep(5)
 tree,labels=cap("ar-initial")
 assert "Room scanner" in labels and not any("FatalException" in s or "could not start" in s for s in labels)
 grpc.channel_ready_future(channel).result(timeout=15)
 status("PASS: AR session initialized, emulator movement endpoint reachable")
 # Let tracking initialize while applying real virtual-camera movement.
 turn(x=-.28)
 for i in range(16):
  move(x=.18 if i%4<2 else -.18,z=.12 if i%4==0 else -.06,seconds=2.3)
  if i<8:turn(y=.18)
  else:turn(y=.34,x=.10 if i%2==0 else -.10)
  tree,labels=cap("motion-"+str(i))
  for s in labels:
   if positive([s]):measurements.append(s)
   for n in re.findall(r"Corners:\s*(\d+)",s):maxcorners=max(maxcorners,int(n))
 status("AR DISTANCES "+str(measurements))
 status("MAX AUTO CORNERS "+str(maxcorners))
 if not measurements:raise AssertionError("No nonzero camera-to-surface distance observed")
 status("PASS: actual ARCore surface hit in virtual scene")
 if maxcorners>=3:status("AUTO: candidate polygon observed; closure/accuracy not verified")
 else:status("AUTO: complete room not obtained")
 # Measure a second pair using the actual tape tool, without injecting coordinates.
 click(tree,"2-point tape")
 tree,labels=cap("tape-mode")
 for label in labels:
  if label.casefold() in ("mark a","add point a","point a","mark first point","set a"):click(tree,label);break
 else:status("Tape mark A label not recognized; evidence preserved")
 move(x=.22,seconds=2.5);turn(y=.12)
 tree,labels=cap("tape-second")
 for label in labels:
  if label.casefold() in ("mark b","add point b","point b","mark second point","set b"):click(tree,label);break
 tree,labels=cap("tape-result")
 status("TAPE LABELS "+str(labels))
finally:
 try:vel(xyz(),timeout=5)
 except Exception:pass
 channel.close()
 (O/"final-log.txt").write_text(adb("logcat","-d",check=False))
 (O/"camera-final.txt").write_text(adb("shell","dumpsys","media.camera",check=False))
