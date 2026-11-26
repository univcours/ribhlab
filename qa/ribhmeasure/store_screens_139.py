import subprocess,time,re,xml.etree.ElementTree as ET
from pathlib import Path
P="com.ribhlab.ribhmeasure"
OUT=Path("qa-output");OUT.mkdir(exist_ok=True)
def adb(*a):return subprocess.check_output(["adb",*a],text=True)
def ui():
    adb("shell","uiautomator","dump","/sdcard/ui.xml")
    return ET.fromstring(adb("shell","cat","/sdcard/ui.xml"))
def tap(x,y):
    adb("shell","input","tap",str(x),str(y));time.sleep(.8)
def node_tap(n):
    x,y,X,Y=map(int,re.findall(r"\d+",n.attrib["bounds"]));tap((x+X)//2,(y+Y)//2)
def click(label):
    for _ in range(5):
        tree=ui();parents={c:p for p in tree.iter() for c in p}
        for n in tree.iter("node"):
            if label.lower() in (n.get("text","").lower(),n.get("content-desc","").lower()):
                a=n
                while a.get("clickable")!="true" and a in parents and parents[a].tag=="node":a=parents[a]
                node_tap(a if a.get("clickable")=="true" else n);return
        time.sleep(.6)
    raise RuntimeError("Missing "+label)
def active(name):
    return any(P+"/."+name in l or P+"/"+P+"."+name in l for l in adb("shell","dumpsys","activity","activities").splitlines() if "ResumedActivity" in l)
def wait(name):
    for _ in range(15):
        if active(name):return
        time.sleep(.6)
    raise RuntimeError("Expected foreground "+name)
def shot(name,activity,contains=None):
    wait(activity)
    if contains and not any(contains in n.get("text","") for n in ui().iter("node")):raise RuntimeError("Missing result "+contains)
    with (OUT/(name+".png")).open("wb") as f:subprocess.run(["adb","exec-out","screencap","-p"],stdout=f,check=True)
    print("Verified screenshot "+name,flush=True)
def home():
    adb("shell","am","force-stop",P);adb("shell","am","start","-W","-n",P+"/.MainActivity");wait("MainActivity");time.sleep(2)
def enter(i,value):
    fields=[n for n in ui().iter("node") if n.get("class")=="android.widget.EditText"]
    if len(fields)<3:raise RuntimeError("Room dimensions fields missing")
    node_tap(fields[i]);adb("shell","input","text",value);time.sleep(.3);adb("shell","input","keyevent","4");time.sleep(.4)
adb("shell","wm","size","1080x1920");adb("shell","wm","density","360")
adb("install","-r","-g",str(next(Path("android/RibhMeasure/app/build/outputs/apk/debug").glob("*.apk"))))
home();shot("01-home","MainActivity")
click("Room plan")
if not active("RoomManualActivity"):tap(265,1200)
wait("RoomManualActivity")
for i,v in enumerate(["5","4","2.8"]):enter(i,v)
shot("02-room-dimensions","RoomManualActivity","20.00")
click("2D / 3D / PDF");shot("03-floor-plan","RoomPlanActivity","20.00")
click("3D");wait("Room3dActivity");time.sleep(2);shot("04-3d-room","Room3dActivity")
adb("shell","input","keyevent","4");wait("RoomPlanActivity");click("Save room project");click("OK");time.sleep(1)
home();click("My projects")
if not active("RoomProjectsActivity"):tap(810,1200)
shot("05-saved-room","RoomProjectsActivity","20.00")
home();click("Screen Ruler")
if not active("RulerActivity"):tap(810,1550)
shot("06-screen-ruler","RulerActivity")
