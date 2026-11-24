import subprocess,time,re,xml.etree.ElementTree as ET
from pathlib import Path
PACKAGE="com.ribhlab.ribhmeasure"
OUT=Path("qa-output");OUT.mkdir(exist_ok=True)
def adb(*args,check=True):
 return subprocess.run(["adb",*args],capture_output=True,text=True,check=check).stdout
def dump():
 adb("shell","uiautomator","dump","/sdcard/measure-ui.xml")
 return ET.fromstring(adb("shell","cat","/sdcard/measure-ui.xml"))
def nodes():
 return list(dump().iter("node"))
def tap_node(n):
 a=list(map(int,re.findall(r"\d+",n.attrib["bounds"])))
 assert len(a)==4,n.attrib
 adb("shell","input","tap",str((a[0]+a[2])//2),str((a[1]+a[3])//2));time.sleep(.6)
def swipe():
 size=adb("shell","wm","size"); w,h=map(int,re.findall(r"(\d+)x(\d+)",size)[-1])
 adb("shell","input","swipe",str(w//2),str(int(h*.75)),str(w//2),str(int(h*.30)),"350");time.sleep(.6)
def find(label,scroll=False,contains=False):
 for k in range(7):
  for n in nodes():
   for field in ("text","content-desc"):
    value=n.attrib.get(field,"")
    if (label.casefold() in value.casefold() if contains else label.casefold()==value.casefold()):
     return n
  if scroll and k in (1,3,5):swipe()
  time.sleep(.6)
 raise AssertionError("Missing UI label: "+label)
def click(label,scroll=False):tap_node(find(label,scroll=scroll))
def screenshot(name):
 with (OUT/(name+".png")).open("wb") as f:subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,check=True)
def start():
 adb("shell","am","start","-W","-f","0x14000000","-n",PACKAGE+"/.MainActivity");time.sleep(2)
def activity(name):
 for i in range(10):
  if PACKAGE+"/."+name in adb("shell","dumpsys","activity","activities"):return
  time.sleep(.5)
 raise AssertionError("Expected activity: "+name)
def input_value(label,value):
 tap_node(find(label));adb("shell","input","text",value);time.sleep(.4)
def mark(message):
 print("PASS: "+message,flush=True)
apk=next(Path("signed-artifacts").glob("*.apk"))
adb("install","-r","-g",str(apk))
adb("logcat","-c")
start();find("Start room scan");screenshot("01-home");mark("Launch signed APK and scan entry")
click("Room plan");activity("RoomManualActivity")
input_value("Length (m)","5");input_value("Width (m)","4");input_value("Height (m)","2.8")
adb("shell","input","keyevent","4");time.sleep(.5)
find("20.00",scroll=True,contains=True);find("56.00",scroll=True,contains=True);screenshot("02-manual");mark("Manual 5 x 4 x 2.8 yields 20 m2 and 56 m3")
click("2D / 3D / PDF",scroll=True);activity("RoomPlanActivity");find("20.00",contains=True);screenshot("03-plan")
click("3D");activity("Room3dActivity");find("3D room");time.sleep(2);screenshot("04-3d")
click("Top");time.sleep(.7);screenshot("05-top");click("Walk");time.sleep(.7);screenshot("06-walk");mark("OpenGL model, top and walk controls")
adb("shell","input","keyevent","4");activity("RoomPlanActivity");click("Save room project");click("OK");time.sleep(.8);mark("Save project")
start();click("My projects");activity("RoomProjectsActivity");find("20.00",contains=True);screenshot("07-saved");click("Open");activity("RoomPlanActivity");mark("Reopen saved project")
start();click("Start room scan");activity("RoomArActivity");time.sleep(3)
find("Manual",contains=False);screenshot("08-ar");mark("AR screen launches and offers manual fallback (no physical tracking validated)")
logs=adb("logcat","-d","-s","AndroidRuntime:E")
(OUT/"android-runtime.log").write_text(logs,encoding="utf-8")
if "FATAL EXCEPTION" in logs and PACKAGE in logs:raise AssertionError("App crashed; see android-runtime.log")
print("All smoke scenarios passed. AR measurements not tested by emulator.",flush=True)
