#!/usr/bin/env python3
"""Enable ABI-only APK splits without dropping ANY application capabilities.

Retain the exact same Android Java/Kotlin/DEX code, web assets, ML Kit data
and native libraries for each supported device ABI. Also retain an all-ABI APK.
Run after the normal Capacitor sync, Compact pass and signing configuration.
"""
from pathlib import Path

p=Path("android/app/build.gradle")
assert p.is_file(), "Generated Android Gradle project not found"
s=p.read_text(encoding="utf-8")
marker="// RivoScan pure-ABI APK packaging. All features and native dependencies stay enabled."
if marker in s:
    raise SystemExit("ABI packaging already enabled; refusing to append twice.")
s+="""\n
%s
// No minification/shrinking flags changed; only native .so ABIs are separated.
android {
  splits {
    abi {
      enable true
      reset()
      include 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'
      universalApk true
    }
  }
}
""" % marker
p.write_text(s,encoding="utf-8")
print("ABI splits enabled: ARM64, ARM32, x86, x86_64, universal.")
print("No runtime feature, Gradle dependency or ML Kit resource removed.")
