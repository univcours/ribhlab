import subprocess, time, re, xml.etree.ElementTree as ET
from pathlib import Path
P="com.ribhlab.ribhmeasure"
O=Path("qa-output"); O.mkdir(exist_ok=True)
def adb(*args,check=True):
 r=subprocess.run(["adb",*args],capture_output=True,text=True,check=check,timeout=45)
 return r.stdout
def capture(name):
 with (O/(name+".png")).open("wb") as f:subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,check=False,timeout=25)
 (O/(name+"-activity.txt")).write_text(adb("shell","dumpsys","activity","activities",check=False),encoding="utf-8")
 (O/(name+"-runtime.txt")).write_text(adb("logcat","-d","-s","AndroidRuntime:E","RoomAR:E",check=False),encoding="utf-8")
 try:
  adb("shell","uiautomator","dump","/sdcard/measure-ui.xml")
  raw=adb("shell","cat","/sdcard/measure-ui.xml")
  (O/(name+".xml")).write_text(raw,encoding="utf-8")
  return list(ET.fromstring(raw).iter("node"))
 except Exception as e:
  print("UI dump error",type(e).__name__,flush=True)
  return []
def find(label,name,attempts=4,scroll=False):
 for i in range(attempts):
  ns=capture(name+"-"+str(i))
  print("UI:",[(n.get("text"),n.get("content-desc")) for n in ns if n.get("text") or n.get("content-desc")],flush=True)
  for n in ns:
   if any(label.casefold() in (n.get(k) or "").casefold() for k in ("text","content-desc")):return n
  if scroll and i%2==0:
   w,h=map(int,re.findall(r"(\d+)x(\d+)",adb("shell","wm","size"))[-1])
   adb("shell","input","swipe",str(w//2),str(int(h*.78)),str(w//2),str(int(h*.35)),"400")
  time.sleep(1)
 raise AssertionError("Cannot locate "+label)
def tap(n):
 x1,y1,x2,y2=map(int,re.findall(r"\d+",n.get("bounds","")));adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2));time.sleep(.9)
def launch():
 print(adb("shell","am","start","-W","-n",P+"/.MainActivity"),flush=True);time.sleep(3)
def field(hint,value):
 tap(find(hint,"field-"+hint.replace(" ","-")));adb("shell","input","text",value);time.sleep(.3)
try:
 apk=next(Path("signed-artifacts").glob("*.apk"))
 print(adb("install","-r","-g",str(apk)),flush=True)
 print("PASS: install signed APK",flush=True)
 adb("logcat","-c");launch()
 find("RivoMeasure","home")
 print("PASS: branded home visible",flush=True)
 find("Start room scan","scan-entry",scroll=True)
 print("PASS: scan entry visible",flush=True)
 # Return to top before navigating the home cards.
 adb("shell","am","force-stop",P);launch()
 tap(find("Room plan","manual-entry",scroll=True))
 field("Length (m)","5");field("Width (m)","4");field("Height (m)","2.8")
 adb("shell","input","keyevent","4");time.sleep(.5)
 find("20.00","area",scroll=True);find("56.00","volume",scroll=True)
 print("PASS: manual 20 m2 / 56 m3",flush=True)
 tap(find("2D / 3D / PDF","plan-entry",scroll=True))
 find("20.00","plan")
 tap(find("3D","3d-entry"));find("3D room","model")
 print("PASS: 3D screen opened",flush=True)
 adb("shell","am","force-stop",P);launch()
 tap(find("Start room scan","ar-entry",scroll=True))
 find("Room scanner","ar-screen")
 print("PASS: AR screen launched (not a real-world AR accuracy test)",flush=True)
finally:
 capture("final")
