#!/usr/bin/env python3
"""Verify that the ONLY difference between universal and slim APKs is ABI packaging.

This is NOT an application feature-removal or 'lite' build. Fail if any ML Kit,
OCR, translation, PDF, app asset, DEX file, or same-ABI native library changes.
"""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json

out=Path("android/app/build/outputs/apk/release")
abis=("arm64-v8a","armeabi-v7a","x86","x86_64")
all_apks={"universal":out/"app-universal-release.apk"}
all_apks.update({abi:out/f"app-{abi}-release.apk" for abi in abis})
for label,p in all_apks.items():
    if not p.is_file() or p.stat().st_size<1_000_000:
        raise SystemExit(f"Missing signed {label} APK: {p}")

def digest(z,name):
    h=hashlib.sha256()
    with z.open(name) as stream:
        while block:=stream.read(1024*1024):
            h.update(block)
    return h.digest()

with ZipFile(all_apks["universal"]) as universal:
    files={f.filename for f in universal.infolist() if not f.is_dir()}
    # Source code and ALL ML Kit model/assets must remain exactly the same.
    common={n for n in files if n.startswith("assets/") or
            (n.startswith("classes") and n.endswith(".dex"))}
    assert common and any(n.startswith("assets/public/") for n in common)
    assert any("mlkit" in n.lower() for n in common), "ML Kit assets missing"
    universal_native={n for n in files if n.startswith("lib/")}
    assert universal_native, "No native ML Kit libraries in baseline APK"
    universal_size=all_apks["universal"].stat().st_size
    summary={"universal_mb":round(universal_size/1e6,2),"variant_mb":{}}
    for abi in abis:
        path=all_apks[abi]
        with ZipFile(path) as slim:
            names={f.filename for f in slim.infolist() if not f.is_dir()}
            actual_common={n for n in names if n.startswith("assets/") or
                           (n.startswith("classes") and n.endswith(".dex"))}
            assert actual_common==common, f"{abi} lost app/ML Kit data or classes"
            for name in sorted(common):
                assert digest(universal,name)==digest(slim,name),f"{abi} changed {name}"
            native={n for n in names if n.startswith("lib/")}
            expected={n for n in universal_native if n.startswith("lib/"+abi+"/")}
            assert expected and native==expected,(
                f"{abi}: native libs missing/changed, expected {sorted(expected)}, actual {sorted(native)}")
            for name in sorted(expected):
                assert digest(universal,name)==digest(slim,name),f"{abi} changed {name}"
            size=path.stat().st_size
            assert size<universal_size*0.75,f"{abi} did not reduce APK significantly"
            summary["variant_mb"][abi]=round(size/1e6,2)
            print(f"[{abi}] {size/1e6:.1f} MB: exactly same DEX, every asset/model, and ABI-specific native libs.")
    (out/"rivoscan-abi-content-verification.json").write_text(
        json.dumps(summary,indent=2)+"\n",encoding="utf-8")
    print("All 4 architectures plus universal verified; NO features or model data removed.")
