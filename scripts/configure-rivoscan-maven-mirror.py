#!/usr/bin/env python3
"""Use Google's documented Maven Central cache for fresh GitHub runners.

Maven Central HTTP 429 is a shared-CI egress/rate-limit response, not a
source-code failure. Keep Google Maven / Gradle Plugin Portal repositories
and the canonical Maven Central as fallbacks. Never change dependency versions.
"""
from pathlib import Path

MIRROR = "https://maven-central.storage-download.googleapis.com/maven2/"
ROOT = Path("android")

if not ROOT.is_dir():
    raise SystemExit("Missing generated Android project; call after cap sync")

changed = []
scanned = []
for path in sorted(ROOT.rglob("*.gradle")):
    if any(part in ("build", ".gradle", ".git") for part in path.parts):
        continue
    text = path.read_text(encoding="utf-8")
    if "mavenCentral()" not in text:
        continue
    scanned.append(str(path))
    if MIRROR in text:
        continue
    # Gradle Groovy DSL: maven(...) repository before mavenCentral() fallback.
    # Replace every occurrence (buildscript, pluginManagement, allprojects).
    repl = f'maven {{ url "{MIRROR}" }}\n        mavenCentral()'
    updated = text.replace("mavenCentral()", repl)
    path.write_text(updated, encoding="utf-8")
    changed.append(str(path))

if not scanned:
    raise SystemExit("No mavenCentral() repository declaration was found in Android Gradle files")

print("Google-hosted Maven Central mirror:", MIRROR)
print("Gradle scripts with repository declarations:", scanned)
print("Gradle scripts patched before building:", changed)
print("Original Maven Central fallbacks and dependency versions are preserved.")
