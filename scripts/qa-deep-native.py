#!/usr/bin/env python3
"""Read-only audit on a dedicated OFFLINE emulator. Never tap ad creatives."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
OUT=Path(os.environ.get("RIVO_NATIVE_QA_DIR","qa-results/native"));OUT.mkdir(parents=True,exist_ok=True)
P="com.ribhlab.rivoscan"
def adb(*args,timeout=35):
 return subprocess.run(["adb",*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout).stdout
def shell(*args):return adb("shell",*args).decode(errors="replace")
def tree():
 for _ in range(5):
  try:
   shell("rm","-f","/sdcard/rivo-deep.xml")
   shell("uiautomator","dump","/sdcard/rivo-deep.xml")
   return ET.fromstring(shell("cat","/sdcard/rivo-deep.xml"))
  except Exception:time.sleep(2)
 raise RuntimeError("Live accessibility tree unavailable")
def labels(t):
 return [v for n in t.iter("node") for v in (n.get("text",""),n.get("content-desc","")) if v]
def tap(t,label):
 candidates=[]
 for n in t.iter("node"):
  if label not in [n.get("text"),n.get("content-desc")]:continue
  b=list(map(int,re.findall(r"\d+",n.get("bounds",""))))
  if len(b)==4 and b[2]>b[0] and b[3]>b[1] and n.get("enabled")!="false":candidates.append((n.get("clickable")=="true",b[3],b))
 if not candidates:raise RuntimeError("Missing action: "+label+" / "+str(labels(t)[:35]))
 _,_,b=max(candidates);shell("input","tap",str((b[0]+b[2])//2),str((b[1]+b[3])//2));time.sleep(1.5)
def wait(marker):
 for _ in range(8):
  t=tree()
  if any(marker.lower() in s.lower() for s in labels(t)):return t
  time.sleep(1)
 raise RuntimeError("Missing screen marker "+marker+" / "+str(labels(t)[:35]))
def capture(name,t):
 (OUT/(name+".xml")).write_text(ET.tostring(t,encoding="unicode"))
 (OUT/(name+".png")).write_bytes(adb("exec-out","screencap","-p"))
 return [{"label":n.get("text") or n.get("content-desc"),"bounds":n.get("bounds"),"class":n.get("class"),"enabled":n.get("enabled")} for n in t.iter("node") if n.get("clickable")=="true"]
report={"scope":"installed signed Android APK; offline; no live ad or camera quality verification","scenarios":[]}
try:
 shell("svc","wifi","disable");shell("svc","data","disable")
 shell("am","force-stop",P)
 shell("am","start","-W","-n",P+"/.MainActivity");time.sleep(8)
 for _ in range(8):
  t=tree();ls=labels(t)
  if "Got it" in ls:tap(t,"Got it")
  elif "Wait" in ls:tap(t,"Wait")
  elif "Home" in ls and "Tools" in ls:break
  else:time.sleep(2)
 for name,button,marker in [("home","Home","Quick actions"),("documents","Documents","My Documents"),("tools","Tools","Read Math Formulas"),("settings","Me","General")]:
  row={"name":name,"status":"FAIL"}
  try:
   tap(tree(),button);t=wait(marker);row.update(status="PASS",controls=capture(name,t))
  except Exception as e:row["detail"]=str(e)
  report["scenarios"].append(row)
  (OUT/"report.json").write_text(json.dumps(report,indent=2))
finally:
 (OUT/"logcat.txt").write_bytes(adb("logcat","-d",timeout=60))
 (OUT/"report.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if len(report["scenarios"])!=4 or any(s["status"]!="PASS" for s in report["scenarios"]):raise SystemExit(1)
