#!/usr/bin/env python3
"""Ensure Google Play AAB includes every supported CPU and every universal APK
ML Kit native library and app asset, unchanged. Run after bundleRelease.
"""
from pathlib import Path
from zipfile import ZipFile
from hashlib import sha256

apk=Path("android/app/build/outputs/apk/release/app-universal-release.apk")
aab=Path("android/app/build/outputs/bundle/release/app-release.aab")
for p in (apk,aab):
    if not p.is_file() or p.stat().st_size<1_000_000:
        raise SystemExit("Missing expected output: "+str(p))
abis={"arm64-v8a","armeabi-v7a","x86","x86_64"}
with ZipFile(apk) as src, ZipFile(aab) as bundle:
    srcnames={i.filename for i in src.infolist() if not i.is_dir()}
    destnames={i.filename for i in bundle.infolist() if not i.is_dir()}
    libnames={x for x in srcnames if x.startswith("lib/")}
    assert libnames, "Universal APK native ML Kit libraries absent"
    for name in sorted(libnames):
        equivalent="base/"+name
        assert equivalent in destnames, "AAB native library absent: "+name
        assert sha256(src.read(name)).digest()==sha256(bundle.read(equivalent)).digest(), (
            "Native library changed in AAB: "+name)
    actual_abis={name.split("/")[1] for name in libnames}
    assert actual_abis==abis,f"AAB does not cover all supported CPU ABIs: {actual_abis}"
    # Android generates dexopt baseline.prof only when making APK; it is not an app feature/model.
    assets={x for x in srcnames if x.startswith("assets/") and not x.startswith("assets/dexopt/")}
    assert assets and any("mlkit" in x for x in assets),"Required ML Kit asset(s) not found"
    for name in sorted(assets):
        equivalent="base/"+name
        assert equivalent in destnames,"AAB feature/model asset missing: "+name
        assert sha256(src.read(name)).digest()==sha256(bundle.read(equivalent)).digest(),(
            "Feature/model asset changed: "+name)
    dex={x for x in srcnames if x.startswith("classes") and x.endswith(".dex")}
    assert dex,"Missing universal APK code"
    for name in dex:
        equivalent="base/dex/"+name
        assert equivalent in destnames,"AAB missing Android app DEX: "+name
        assert sha256(src.read(name)).digest()==sha256(bundle.read(equivalent)).digest(),(
            "Android app code modified by AAB: "+name)
    assert "base/manifest/AndroidManifest.xml" in destnames
print("AAB OK: all four ABIs, every app asset/ML Kit model, every DEX class and")
print("every original ABI native .so are byte-identical to signed UNIVERSAL APK.")
