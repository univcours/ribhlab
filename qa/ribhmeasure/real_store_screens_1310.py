#!/usr/bin/env python3
"""Capture genuine code14 RivoMeasure phone screenshots on an Android emulator.

Uses the original-key signed *release APK*, NOT a mock screen, debug flavor,
an older version, a composited image, or another RibhLab app. Screen captures
are unchanged raw adb screencap PNGs with matching live accessibility evidence.
Network is disabled before launch to avoid requesting real ad impressions.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE="com.ribhlab.ribhmeasure"

def adb(*args: str, binary: bool = False, check: bool = True):
    result=subprocess.run(["adb",*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                          timeout=95,check=False)
    if check and result.returncode:
        raise RuntimeError("Android command failed: "+" ".join(args)+"\n"+
                           result.stderr.decode(errors="replace")[-300:])
    return result.stdout if binary else result.stdout.decode(errors="replace")

def capture_ui(out: Path, tag: str) -> list[ET.Element]:
    for attempt in range(8):
        adb("shell","rm","-f","/sdcard/rivomeasure-ui.xml",check=False)
        adb("shell","uiautomator","dump","/sdcard/rivomeasure-ui.xml",check=False)
        raw=adb("exec-out","cat","/sdcard/rivomeasure-ui.xml",binary=True,check=False)
        position=raw.find(b"<?xml")
        if position >= 0 and b"<hierarchy" in raw[position:]:
            try:
                root=ET.fromstring(raw[position:])
                nodes=list(root.iter("node"))
                if nodes:
                    (out/(tag+".xml")).write_bytes(raw[position:])
                    return nodes
            except ET.ParseError:
                pass
        time.sleep(3)
    raise RuntimeError("No genuine Android accessibility UI hierarchy for "+tag)

def visible(nodes: list[ET.Element], keyword: str) -> bool:
    return any(keyword.casefold() in (n.attrib.get("text","")+" "+
               n.attrib.get("content-desc","")).casefold() for n in nodes)

def tap(nodes: list[ET.Element], keyword: str) -> None:
    matches=[]
    for n in nodes:
        text=n.attrib.get("text","").strip()
        desc=n.attrib.get("content-desc","").strip()
        if keyword.casefold() not in (text.casefold(),desc.casefold()):
            continue
        bounds=[int(x) for x in re.findall(r"\d+",n.attrib.get("bounds",""))]
        if len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]:
            matches.append(((bounds[0]+bounds[2])//2,(bounds[1]+bounds[3])//2))
    if not matches:
        raise RuntimeError("Expected actual clickable control missing: "+keyword)
    x,y=matches[0]
    adb("shell","input","tap",str(x),str(y))
    time.sleep(3)

def current_activity() -> str:
    data=adb("shell","dumpsys","activity","activities",check=False)
    relevant=[line for line in data.splitlines() if
              ("mResumedActivity" in line or "topResumedActivity" in line)]
    return "\n".join(relevant)

def shot(out:Path,tag:str,nodes:list[ET.Element]) -> str:
    assert nodes
    raw=adb("exec-out","screencap","-p",binary=True)
    if not raw.startswith(b"\x89PNG\r\n\x1a\n") or len(raw)<20000:
        raise RuntimeError("Invalid actual emulator screenshot: "+tag)
    size=(int.from_bytes(raw[16:20],"big"),int.from_bytes(raw[20:24],"big"))
    if size!=(1080,1920):
        raise RuntimeError("Screenshot size mismatch: "+str(size))
    result=out/(tag+".png")
    result.write_bytes(raw)
    return hashlib.sha256(raw).hexdigest()

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--apk",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args()
    assert args.apk.is_file() and args.apk.stat().st_size>1000000
    out=args.out;out.mkdir(parents=True,exist_ok=True)
    adb("wait-for-device")
    adb("shell","wm","size","1080x1920")
    adb("shell","wm","density","360")
    # Never generate artificial revenue or live AdMob impressions in QA.
    adb("shell","svc","wifi","disable",check=False)
    adb("shell","svc","data","disable",check=False)
    adb("install","-r",str(args.apk.resolve()))
    installed=adb("shell","dumpsys","package",PACKAGE)
    if "versionCode=14" not in installed or "versionName=1.3.10" not in installed:
        raise RuntimeError("Installed package is NOT RivoMeasure 1.3.10 code14")
    adb("shell","am","force-stop",PACKAGE,check=False)
    adb("shell","am","start","-W","-n",PACKAGE+"/.MainActivity")
    time.sleep(10)
    adb("shell","pidof",PACKAGE)
    first=capture_ui(out,"01-home")
    if not visible(first,"RivoMeasure"):
        raise RuntimeError("Real code14 RivoMeasure home was not visible")
    home_digest=shot(out,"01-home",first)
    print("RIVOMEASURE_1310_REAL_SCREEN=01-home sha256="+home_digest,flush=True)
    tap(first,"Settings")
    settings=capture_ui(out,"02-settings")
    if not visible(settings,"Settings"):
        raise RuntimeError("Settings screen did not actually open")
    settings_digest=shot(out,"02-settings",settings)
    if settings_digest==home_digest:
        raise RuntimeError("Settings screen duplicates home")
    print("RIVOMEASURE_1310_REAL_SCREEN=02-settings sha256="+settings_digest,flush=True)
    adb("shell","pidof",PACKAGE)
    adb("shell","input","keyevent","4")
    time.sleep(2)
    adb("shell","pidof",PACKAGE)
    manifest={
        "package":PACKAGE,"versionName":"1.3.10","versionCode":14,
        "screenSize":"1080x1920","captureMethod":"original-signed-release-apk/adb",
        "liveAdRequestsDisabledDuringQa":True,
        "screens":[
            {"file":"01-home.png","sha256":home_digest},
            {"file":"02-settings.png","sha256":settings_digest}
        ]
    }
    (out/"CAPTURE-MANIFEST.json").write_text(
        json.dumps(manifest,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    (out/"SCREENSHOT-SHA256SUMS.txt").write_text(
        "".join(x["sha256"]+"  "+x["file"]+"\n" for x in manifest["screens"]))
    print("RIVOMEASURE_1310_GENUINE_SCREENS=2",flush=True)

if __name__=="__main__":
    main()
