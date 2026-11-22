#!/usr/bin/env python3
"""Fail the RivoScan Android build unless its launch Activity is portrait-only."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

manifest=Path(sys.argv[1]) if len(sys.argv)>1 else Path("android/app/src/main/AndroidManifest.xml")
if not manifest.is_file():
    raise SystemExit("Missing AndroidManifest.xml: "+str(manifest))
root=ET.parse(manifest).getroot()
ns="{http://schemas.android.com/apk/res/android}"
main=[]
for activity in root.findall(".//activity"):
    name=activity.get(ns+"name","")
    if name in (".MainActivity","com.ribhlab.rivoscan.MainActivity"):
        main.append(activity)
if len(main)!=1:
    raise SystemExit("Exactly one RivoScan launcher MainActivity is required.")
direction=main[0].get(ns+"screenOrientation")
if direction!="portrait":
    raise SystemExit(f"RivoScan must be portrait-only; manifest orientation is {direction!r}")
print("[RivoScan] Android MainActivity verified PORTRAIT ONLY.")
