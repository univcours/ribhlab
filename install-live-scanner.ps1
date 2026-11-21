# Run after npx cap add android / npx cap sync android.
# Idempotent integration into the generated Capacitor Android wrapper.
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$android=Join-Path $root 'android'
$source=Join-Path $root 'native\android'
if(-not (Test-Path (Join-Path $android 'app\build.gradle'))) { throw 'Android wrapper not found. Run npm install, npm run build, npx cap add android (first time), npx cap sync android.' }
$packageDir=Join-Path $android 'app\src\main\java\com\ribhlab\rivoscan'
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
foreach($filename in @('RivoLiveScannerPlugin.java','RivoDocumentsPlugin.java','RivoSounds.java','RivoLocale.java','RivoEdgeDetector.java','RivoCropEditor.java','RivoDocumentEnhancer.java','RivoPerfectClean.java','RivoScanPagesManager.java','RivoLiveScannerActivity.java','RivoCaptureQuality.java','RivoUVDocPlugin.java','RivoSurface3DPlugin.java','RivoPlayUpdatePlugin.java')) {
  $src=Join-Path $source $filename
  if(-not(Test-Path $src)){throw "Missing native scanner source: $src"}
  Copy-Item -LiteralPath $src -Destination (Join-Path $packageDir $filename) -Force
}
$main=Join-Path $packageDir 'MainActivity.java'
# Recreate the standard generated bridge entry point, with the local plugin registered.
$mainJava=@'
package com.ribhlab.rivoscan;

import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import android.graphics.Color;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import androidx.appcompat.app.ActionBar;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        // Android 15/16: no deprecated status/navigation bar color setters.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        // Do NOT set system-bar appearance before BridgeActivity is initialized:
        // the Android/Capacitor theme can reset the clock/signal/battery tint.
        registerPlugin(RivoLiveScannerPlugin.class);
        registerPlugin(RivoDocumentsPlugin.class);
        registerPlugin(RivoUVDocPlugin.class);
        registerPlugin(RivoSurface3DPlugin.class);
        registerPlugin(RivoPlayUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        applyReadableStatusBar();
        // A second Android AppCompat ActionBar was displaying above RivoScan's
        // own branded HTML header. Hide it even on upgraded installations.
        ActionBar nativeActionBar=getSupportActionBar();
        if(nativeActionBar!=null)nativeActionBar.hide();
        // Reserve real system/gesture/keyboard insets around the WebView.
        // The root background draws behind transparent status/navigation bars.
        View content = findViewById(android.R.id.content);
        View web = getBridge().getWebView();
        content.setBackgroundColor(Color.rgb(233,245,251));
        web.setBackgroundColor(Color.rgb(233,245,251));
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() |
                WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            int bottom = Math.max(bars.bottom, keyboard.bottom);
            if (view.getPaddingLeft()!=bars.left || view.getPaddingTop()!=bars.top ||
                view.getPaddingRight()!=bars.right || view.getPaddingBottom()!=bottom) {
                view.setPadding(bars.left,bars.top,bars.right,bottom);
            }
            return insets;
        });
        ViewCompat.requestApplyInsets(content);
        // Android 15/16 edge-to-edge: reassert dark native symbols after
        // the WebView and decor view finish applying their own window flags.
        content.post(this::applyReadableStatusBar);
    }

    private void applyReadableStatusBar() {
        // Native system icons (time, signal, Wi-Fi, battery) are OS-owned.
        // Dark icons on the existing light #E9F5FB status-bar background;
        // do not draw fake status icons in HTML or cover the real system bar.
        new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(true);
    }

    @Override protected void onResume() {
        super.onResume();
        applyReadableStatusBar();
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if(hasFocus) applyReadableStatusBar();
    }
}
'@
[System.IO.File]::WriteAllText($main,$mainJava,[System.Text.UTF8Encoding]::new($false))

$gradle=Join-Path $android 'app\build.gradle'
$gradleText=[System.IO.File]::ReadAllText($gradle)
$deps=@'
    // RivoScan: on-screen live document outlines and drag-adjustable perspective crop
    implementation 'androidx.camera:camera-core:1.6.2'
    implementation 'androidx.camera:camera-camera2:1.6.2'
    implementation 'androidx.camera:camera-lifecycle:1.6.2'
    implementation 'androidx.camera:camera-view:1.6.2'
    implementation 'androidx.exifinterface:exifinterface:1.4.2'
    implementation 'org.opencv:opencv:4.14.0'
'@
if($gradleText -notmatch "androidx\.camera:camera-view:1\.6\.2") {
  if($gradleText -notmatch 'dependencies\s*\{') {throw 'Gradle dependencies section not found.'}
  $gradleText=[regex]::Replace($gradleText,'dependencies\s*\{',"dependencies {`r`n$deps",1)
}
# Google Play Core in-app updates (official Google library).
if($gradleText -notmatch 'com\.google\.android\.play:app-update:') {
  $playUpdate="    implementation 'com.google.android.play:app-update:2.1.0'"
  $gradleText=[regex]::Replace($gradleText,'dependencies\s*\{',"dependencies {`r`n$playUpdate",1)
}
# Official PaddlePaddle UVDoc ONNX mobile CPU backend (verified source + SHA-256).
# Kept separate from CameraX dependencies: upgrades of existing Android projects
# must receive ONNX Runtime even if the CameraX block already exists.
if($gradleText -notmatch 'com\.microsoft\.onnxruntime:onnxruntime-android:') {
  $uvRuntime="    implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.31.1'"
  $gradleText=[regex]::Replace($gradleText,'dependencies\s*\{',"dependencies {`r`n$uvRuntime",1)
}
$gradleText=$gradleText.Replace("getDefaultProguardFile('proguard-android.txt')","getDefaultProguardFile('proguard-android-optimize.txt')")
# Ensure real Release AAB runs R8: generated Capacitor templates default to minifyEnabled=false.
if($gradleText -notmatch 'RIVOSCAN_R8_RELEASE_OPTIMIZATION'){
 $gradleText += @'

// RIVOSCAN_R8_RELEASE_OPTIMIZATION
android {
  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
'@
}
[System.IO.File]::WriteAllText($gradle,$gradleText,[System.Text.UTF8Encoding]::new($false))
$proguard=Join-Path $android 'app\proguard-rules.pro'
if(-not(Test-Path -LiteralPath $proguard)){throw 'No Capacitor ProGuard rules; R8 cannot be enabled safely'}
$rules=[System.IO.File]::ReadAllText($proguard)
if($rules -notmatch 'RIVOSCAN_KEEP_NATIVE_ENTRY_POINTS'){
 $rules += @'

# RIVOSCAN_KEEP_NATIVE_ENTRY_POINTS: preserve native entry points, not the entire DEX.
-keep class com.ribhlab.rivoscan.MainActivity { *; }
-keep class com.ribhlab.rivoscan.Rivo*Plugin { *; }
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,Signature,InnerClasses,EnclosingMethod
'@
 [System.IO.File]::WriteAllText($proguard,$rules,[System.Text.UTF8Encoding]::new($false))
}

if($env:RIVO_COMPACT_BUILD -ne '1') {
# Bundle UVDoc ONNX model into Android assets after verifying the official
# PaddlePaddle Apache-2.0 model bytes. No user document is transmitted.
# Model is ~31.7 MB, and is kept intact across incremental local builds.
$uvdocAssets=Join-Path $android 'app\src\main\assets\uvdoc'
New-Item -ItemType Directory -Path $uvdocAssets -Force | Out-Null
$uvdocFile=Join-Path $uvdocAssets 'inference.onnx'
$uvdocExpected='54cab30dc2cf347b4f3d6971c833b1c3d84f5ef17280f1f6d15796bff20e63d6'
$uvdocCorrect=(Test-Path $uvdocFile) -and ((Get-FileHash -LiteralPath $uvdocFile -Algorithm SHA256).Hash.ToLowerInvariant() -eq $uvdocExpected)
if(-not $uvdocCorrect) {
  $uvdocTemp=Join-Path $uvdocAssets 'inference.download'
  if(Test-Path $uvdocTemp){Remove-Item -LiteralPath $uvdocTemp -Force}
  try {
    $uvdocURL='https://huggingface.co/PaddlePaddle/UVDoc_onnx/resolve/main/inference.onnx?download=true'
    Invoke-WebRequest -Uri $uvdocURL -OutFile $uvdocTemp -UseBasicParsing
    if((Get-FileHash -LiteralPath $uvdocTemp -Algorithm SHA256).Hash.ToLowerInvariant() -ne $uvdocExpected) {
      throw 'UVDoc model SHA-256 does not match verified official bytes.'
    }
    Move-Item -LiteralPath $uvdocTemp -Destination $uvdocFile -Force
  } catch {
    if(Test-Path $uvdocTemp){Remove-Item -LiteralPath $uvdocTemp -Force}
    throw ('UVDoc model must be downloaded and verified for this build. No fake Android model is shipped. ' + $_.Exception.Message)
  }
}
Write-Host 'UVDoc official ONNX model SHA-256 verified and bundled into Android assets.' -ForegroundColor Green
} else {
  Write-Host 'Compact build: skipping optional 30 MB UVDoc model.' -ForegroundColor Yellow
}



# Use a real NoActionBar theme in the actual Android Activity. The native title
# bar is NOT the Android status bar (clock, signal, battery), which stays visible.
# Generated Capacitor wrappers may otherwise inherit AppCompat's default toolbar.
$themeFile=Join-Path $android 'app\src\main\res\values\rivoscan_no_actionbar.xml'
$themeXml=@'
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="RivoScanNoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="windowActionBar">false</item>
    <item name="windowNoTitle">true</item>
    <item name="android:windowActionBar">false</item>
    <item name="android:windowNoTitle">true</item>
    <item name="android:windowBackground">#E9F5FB</item>
    <!-- Match the original light system/status area with readable DARK OS icons.
         On Android 15+ the inset-aware root already draws #E9F5FB under
         the transparent status bar; this theme also covers older Android. -->
    <item name="android:windowLightStatusBar">true</item>
    <item name="android:statusBarColor">#E9F5FB</item>
  </style>
</resources>
'@
[IO.File]::WriteAllText($themeFile,$themeXml,[Text.UTF8Encoding]::new($false))

$manifest=Join-Path $android 'app\src\main\AndroidManifest.xml'
$m=[System.IO.File]::ReadAllText($manifest)
if($m -notmatch 'android\.permission\.CAMERA') {
 $m=$m.Replace('<application','<uses-permission android:name="android.permission.CAMERA" />' + "`r`n    " + '<uses-feature android:name="android.hardware.camera" android:required="false" />' + "`r`n    " + '<application')
}
if($m -notmatch 'RivoLiveScannerActivity') {
 $m=$m.Replace('</application>','    <activity android:name=".RivoLiveScannerActivity" android:exported="false"  />' + "`r`n    " + '</application>')
}
# Force the MainActivity theme without touching RivoLiveScannerActivity or
# unrelated manifest declarations. Fail rather than silently shipping two bars.
$activityPattern='(?s)<activity\b[^>]*android:name\s*=\s*"(?:\.MainActivity|com\.ribhlab\.rivoscan\.MainActivity)"[^>]*>'
$activityMatch=[regex]::Matches($m,$activityPattern)
if($activityMatch.Count -ne 1){throw 'RivoScan MainActivity manifest entry not found uniquely; cannot suppress extra Android toolbar.'}
$oldActivity=$activityMatch[0].Value
if($oldActivity -match 'android:theme\s*=\s*"[^"]*"'){
  $newActivity=[regex]::Replace($oldActivity,'android:theme\s*=\s*"[^"]*"','android:theme="@style/RivoScanNoActionBar"')
}else{
  $newActivity=$oldActivity.Substring(0,$oldActivity.Length-1)+' android:theme="@style/RivoScanNoActionBar">'
}
$m=$m.Replace($oldActivity,$newActivity)
# Android 16: no orientation/size locks on phones, foldables or tablets.
$m=[regex]::Replace($m,'\s+android:screenOrientation="[^"]+"','')
$m=[regex]::Replace($m,'\s+android:resizeableActivity="[^"]+"','')
if(([regex]::Matches($m,'<application\b')).Count -ne 1){throw 'Android manifest application element must be unique'}
$m=$m.Replace('<application','<application android:resizeableActivity="true"')
[System.IO.File]::WriteAllText($manifest,$m,[System.Text.UTF8Encoding]::new($false))
& (Join-Path $root 'apply-rivoscan-branding.ps1')
Write-Host 'RivoScan live edge camera + manual crop + gallery import integrated into Android.' -ForegroundColor Green
