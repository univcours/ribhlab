#!/usr/bin/env python3
"""Produce a genuine small RivoScan APK: Google ML Kit + PerfectClean stay.
Only experimental UVDoc/ONNX/3D and obsolete CameraX/OpenCV are removed.
Translation, barcode, OCR, PDF tools, privacy, sharing and sounds are kept.
Run AFTER Capacitor sync and the normal native installer, BEFORE Gradle.
"""
from pathlib import Path
import re, shutil
ROOT=Path(__file__).resolve().parents[1]
ANDROID=ROOT/"android"/"app"
SOURCE=ANDROID/"src"/"main"
JAVA=SOURCE/"java"/"com"/"ribhlab"/"rivoscan"
assert (JAVA/"RivoDocumentsPlugin.java").is_file(), "RivoDocuments must stay"
assert (JAVA/"RivoPerfectClean.java").is_file(), "PerfectClean must stay"
assert (JAVA/"RivoSounds.java").is_file(), "Native sound controls must stay"
# Every old class depending on OpenCV, UVDoc or CameraX is absent in compact.
obsolete=[
 "RivoLiveScannerActivity.java","RivoCaptureQuality.java","RivoCropEditor.java",
 "RivoDocumentEnhancer.java","RivoEdgeDetector.java","RivoScanPagesManager.java",
 "RivoUVDocPlugin.java","RivoSurface3DPlugin.java"
]
for name in obsolete:
    (JAVA/name).unlink(missing_ok=True)
main=JAVA/"MainActivity.java"
source=main.read_text(encoding="utf-8")
for clazz in ["RivoUVDocPlugin","RivoSurface3DPlugin"]:
    marker=f"registerPlugin({clazz}.class);"
    assert marker in source, f"Expected optional plugin registration: {clazz}"
    source=source.replace(marker, f"// Compact build omits {clazz} (Full APK only).")
main.write_text(source,encoding="utf-8")
# Preserve the RivoLiveScanner plugin name as a tiny native sound control.
# Legacy scan calls are explicitly rejected instead of triggering missing classes.
(JAVA/"RivoLiveScannerPlugin.java").write_text("""package com.ribhlab.rivoscan;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="RivoLiveScanner")
public class RivoLiveScannerPlugin extends Plugin {
  @PluginMethod public void getSoundSettings(PluginCall call) {
    JSObject v=new JSObject();v.put("enabled",RivoSounds.enabled(getContext()));call.resolve(v);
  }
  @PluginMethod public void setSoundSettings(PluginCall call) {
    Boolean enabled=call.getBoolean("enabled");
    if(enabled==null){call.reject("Invalid sound setting.");return;}
    RivoSounds.setEnabled(getContext(),enabled);
    JSObject v=new JSObject();v.put("enabled",enabled);call.resolve(v);
  }
  @PluginMethod public void playFeedback(PluginCall call) {
    RivoSounds.play(getContext(),call.getString("kind","tap"));call.resolve();
  }
  @PluginMethod public void scan(PluginCall call) {
    call.reject("Compact Android uses Google ML Kit Document Scanner.");
  }
}
""",encoding="utf-8")
manifest=SOURCE/"AndroidManifest.xml"
xml=manifest.read_text(encoding="utf-8")
xml,count=re.subn(r'\s*<activity\b[^>]*android:name="\.RivoLiveScannerActivity"[^>]*/>',"",xml)
assert count==1, f"Expected one legacy camera activity, found {count}"
manifest.write_text(xml,encoding="utf-8")
gradle=ANDROID/"build.gradle"
s=gradle.read_text(encoding="utf-8")
packages=[
 "androidx.camera:camera-core", "androidx.camera:camera-camera2",
 "androidx.camera:camera-lifecycle", "androidx.camera:camera-view",
 "androidx.exifinterface:exifinterface", "org.opencv:opencv",
 "com.microsoft.onnxruntime:onnxruntime-android"
]
for dependency in packages:
    s,num=re.subn(r"(?m)^\s*implementation\s+['\"]"+re.escape(dependency)+r":[^'\"]+['\"]\s*$","",s)
    assert num==1, f"Expected one compact-excluded Gradle dependency {dependency}: {num}"
gradle.write_text(s,encoding="utf-8")
model=SOURCE/"assets"/"uvdoc"
if model.exists():shutil.rmtree(model)
# Fail closed on any Java-source references that would re-add the legacy native libs.
for source in JAVA.glob("*.java"):
    text=source.read_text(encoding="utf-8")
    assert not re.search(r"import\s+(?:org\.opencv|ai\.onnxruntime|androidx\.camera)\.",text),source
    assert "RivoLiveScannerActivity" not in text,source
print("[RivoScan Compact] Kept: Google FULL + PerfectClean, translation, PDF, privacy, QR, sound")
print("[RivoScan Compact] Removed from APK: obsolete CameraX/OpenCV, ONNX UVDoc, 3D model")
