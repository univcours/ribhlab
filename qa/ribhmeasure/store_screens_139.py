import subprocess,time,re,xml.etree.ElementTree as ET
from pathlib import Path
PACKAGE="com.ribhlab.ribhmeasure"
OUT=Path("qa-output");OUT.mkdir(exist_ok=True)
def adb(*args,check=True):
    return subprocess.run(["adb",*args],capture_output=True,text=True,check=check).stdout
def nodes():
    adb("shell","uiautomator","dump","/sdcard/measure-ui.xml")
    return list(ET.fromstring(adb("shell","cat","/sdcard/measure-ui.xml")).iter("node"))
def click(label):
    for k in range(5):
        for n in nodes():
            if label.casefold() in [n.attrib.get("text","").casefold(),n.attrib.get("content-desc","").casefold()]:
                x1,y1,x2,y2=map(int,re.findall(r"\d+",n.attrib["bounds"]))
                adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2));time.sleep(1);return
        adb("shell","input","swipe","540","1430","540","530","400");time.sleep(.5)
    raise RuntimeError("Missing "+label)
def start():
    adb("shell","am","force-stop",PACKAGE)
    adb("shell","am","start","-W","-n",PACKAGE+"/.MainActivity");time.sleep(3)
def shot(name):
    state=adb("shell","dumpsys","activity","activities")
    if not any(PACKAGE in line and ("mResumedActivity" in line or "topResumedActivity" in line) for line in state.splitlines()):
        raise RuntimeError("App not foreground")
    with (OUT/(name+".png")).open("wb") as f:
        subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,check=True)
    print("Captured",name,flush=True)
adb("shell","wm","size","1080x1920")
adb("shell","wm","density","360")
adb("install","-r","-g",str(next(Path("android/RibhMeasure/app/build/outputs/apk/debug").glob("*.apk"))))
start();shot("01-home")
for name,label in [("02-room-manual","Room plan"),("03-ruler","Ruler"),("04-level","Level"),("05-projects","My projects")]:
    try:
        start();click(label);shot(name)
    except Exception as e: print("Skipped",name,e,flush=True)
if len(list(OUT.glob("*.png")))<2:raise RuntimeError("Fewer than two actual app screenshots")
