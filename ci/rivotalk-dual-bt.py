import subprocess as sp,time,re,xml.etree.ElementTree as ET
from pathlib import Path
import os,atexit
A,B="emulator-5554","emulator-5556"
out=Path("rivotalk-dual-evidence");out.mkdir(exist_ok=True)
pkg="com.ribhlab.rivotalk"
def adb(d,*args,timeout=30,check=True):
    r=sp.run(["adb","-s",d,*args],capture_output=True,text=True,timeout=timeout)
    if check and r.returncode: raise RuntimeError(str((d,args,r.stdout,r.stderr)))
    return r.stdout
def ui(d):
    last=None
    for attempt in range(6):
        try:
            adb(d,"shell","uiautomator","dump","/sdcard/rivo-dual.xml",timeout=45)
            xml=adb(d,"shell","cat","/sdcard/rivo-dual.xml")
            return list(ET.fromstring(xml).iter("node"))
        except Exception as e:
            last=e
            print("UIAUTOMATOR_RETRY",d,attempt,str(e)[:280],flush=True)
            time.sleep(2+attempt)
    raise RuntimeError(f"{d}: Android UI unavailable after retries: {last}")
def labels(d):
    return [(n.get("text",""),n.get("content-desc","")) for n in ui(d)]
def tap(d,pattern,optional=False):
    try: nodes=ui(d)
    except Exception as e:
        if optional:
            print("OPTIONAL_UI_UNAVAILABLE",d,pattern,str(e)[:200],flush=True)
            return False
        raise
    for n in nodes:
        if any(re.search(pattern,n.get(k,""),re.I) for k in ("text","content-desc")):
            x,y,X,Y=map(int,re.findall(r"\d+",n.get("bounds","")))
            if X>x and Y>y:
                adb(d,"shell","input","tap",str((X+x)//2),str((Y+y)//2));time.sleep(2);return True
    if not optional: raise RuntimeError(f"{d}: {pattern} unavailable: {labels(d)}")
    return False
def wait_label(d,p,tries=15):
    for _ in range(tries):
        try:
            if any(re.search(p,t,re.I) for pair in labels(d) for t in pair): return
        except Exception: pass
        time.sleep(2)
    raise RuntimeError(f"{d}: {p} not reached: {labels(d)}")
def launch(d):
    adb(d,"shell","am","start","-W","-n",pkg+"/.MainActivity")
    wait_label(d,"Ready to connect")
def dump(d,stage):
    (out/f"{d}-{stage}.txt").write_text(adb(d,"shell","dumpsys","activity","services",pkg))
def capture(d,name):
    with (out/f"{name}.png").open("wb") as f: sp.run(["adb","-s",d,"exec-out","screencap","-p"],stdout=f,check=True)
for d,name in [(A,"RivoHost"),(B,"RivoGuest")]:
    adb(d,"shell","wm","size","1080x1920")
    adb(d,"shell","wm","density","420")
    adb(d,"shell","settings","put","global","device_name",name)
    adb(d,"shell","settings","put","global","show_first_crash_dialog","0")
    adb(d,"shell","settings","put","global","anr_show_background","0")
    adb(d,"shell","svc","bluetooth","enable")
    adb(d,"shell","svc","wifi","disable")
    adb(d,"shell","svc","data","disable")
    adb(d,"install","-r",os.environ["RIVO_APK"],timeout=120)
    for p in ["RECORD_AUDIO","BLUETOOTH_CONNECT","POST_NOTIFICATIONS"]:
        adb(d,"shell","pm","grant",pkg,"android.permission."+p)
    adb(d,"shell","am","start","-a","android.settings.BLUETOOTH_SETTINGS")
    time.sleep(3)
# Start recording actual screens before pairing, to preserve evidence when an OS pairing UI fails.
records=[]
def stop_capture():
    for d,p in records:
        adb(d,"shell","pkill","-2","screenrecord",check=False)
        try: p.wait(timeout=12)
        except sp.TimeoutExpired: p.terminate()
        adb(d,"pull","/sdcard/rivotalk-peer.mp4",str(out/f"{d}.mp4"),timeout=90,check=False)
atexit.register(stop_capture)
for d in (A,B):
    records.append((d,sp.Popen(["adb","-s",d,"shell","screenrecord","--time-limit","180","--size","720x1280","--bit-rate","2400000","/sdcard/rivotalk-peer.mp4"])))
time.sleep(2)
# Settings discovery makes the phones discoverable. Use ordinary OS pairing controls.
for d in [A,B]:
    tap(d,"Pair new device",optional=True)
    time.sleep(4)
    print(d,labels(d),flush=True)
# Prefer the explicit peer name; if Android reports identical names, inspect address/name via dumpsys.
if not tap(B,r"^RivoHost$",optional=True):
    for _ in range(8):
        print("B discovery",labels(B),flush=True)
        if tap(B,r"^RivoHost$|^sdk_gphone64_x86_64$|^Android Emulator$",optional=True): break
        time.sleep(3)
    else: raise RuntimeError("Peer not discoverable through shared Netsim")
for _ in range(8):
    for d in (A,B): tap(d,r"^Pair$",optional=True)
    time.sleep(2)
    if all("BONDED" in adb(d,"shell","dumpsys","bluetooth_manager") for d in (A,B)): break
for d in (A,B):
    (out/f"{d}-bluetooth.txt").write_text(adb(d,"shell","dumpsys","bluetooth_manager"))
    launch(d)
try:
    tap(A,r"^Create group$")
    wait_label(A,"Channel available")
    # The client selects the bonded host in the genuine app.
    tap(B,r"^Refresh paired devices$",optional=True)
    tap(B,r"RivoHost|sdk_gphone64_x86_64|Android Emulator")
    tap(B,r"^Join selected phone$")
    for d in (A,B): wait_label(d,"Verify connection|Codes match")
    for d in (A,B): capture(d,d+"-verify")
    # Check the actual displayed SAS before accepting it, not a fabricated verification.
    def code(d):
        return [t for pair in labels(d) for t in pair if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 :\-]{4,80}",t) and sum(c.isdigit() for c in t)>=5]
    ca,cb=code(A),code(B)
    print("SAS",ca,cb,flush=True)
    assert set(ca)&set(cb),"Matching SAS not verified"
    for d in (A,B): tap(d,r"^Codes match$")
    for d in (A,B): wait_label(d,"2 connected members")
    dump(A,"connected");dump(B,"connected")
    # Guest goes to background while host sends a real PTT audio stream.
    adb(B,"shell","input","keyevent","3")
    tap(A,r"^Start talking \(toggle\)$")
    time.sleep(8)
    dump(B,"background")
    adb(B,"shell","cmd","statusbar","expand-notifications")
    wait_label(B,"RivoTalk")
    capture(B,"guest-notification")
    tap(A,r"^Stop talking \(toggle\)$")
    adb(B,"shell","cmd","statusbar","collapse")
    adb(B,"shell","am","start","-W","-n",pkg+"/.MainActivity")
    for d in (A,B):
        tap(d,r"^Diagnostics$")
        wait_label(d,"Payload bytes received")
        ls=labels(d)
        (out/f"{d}-diagnostics.txt").write_text(str(ls))
        capture(d,d+"-diagnostics")
        vals=[int(m.group(1)) for pair in ls for t in pair if (m:=re.search(r"Payload bytes (?:sent|received):\s*(\d+)",t))]
        assert vals and max(vals)>0,"No real data exchange measured"
    print("DUAL_DEVICE_VERIFIED: both endpoints showed 2 members and nonzero payload counters",flush=True)
finally:
    stop_capture()
    records.clear()
