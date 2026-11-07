# Run after npx cap add android / npx cap sync android.
# Idempotent integration into the generated Capacitor Android wrapper.
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$android=Join-Path $root 'android'
$source=Join-Path $root 'native\android'
if(-not (Test-Path (Join-Path $android 'app\build.gradle'))) { throw 'Android wrapper not found. Run npm install, npm run build, npx cap add android (first time), npx cap sync android.' }
$packageDir=Join-Path $android 'app\src\main\java\com\ribhlab\rivoscan'
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
foreach($filename in @('RivoLiveScannerPlugin.java','RivoDocumentsPlugin.java','RivoSounds.java','RivoLocale.java','RivoEdgeDetector.java','RivoCropEditor.java','RivoDocumentEnhancer.java','RivoScanPagesManager.java','RivoLiveScannerActivity.java','RivoCaptureQuality.java','RivoUVDocPlugin.java','RivoSurface3DPlugin.java')) {
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
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import androidx.appcompat.app.ActionBar;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        // Keep Android's real clock, network and battery bar visible.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.rgb(237, 249, 246));
        new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView())
            .setAppearanceLightStatusBars(true);
        registerPlugin(RivoLiveScannerPlugin.class);
        registerPlugin(RivoDocumentsPlugin.class);
        registerPlugin(RivoUVDocPlugin.class);
        registerPlugin(RivoSurface3DPlugin.class);
        super.onCreate(savedInstanceState);
        // A second Android AppCompat ActionBar was displaying above RivoScan's
        // own branded HTML header. Hide it even on upgraded installations.
        ActionBar nativeActionBar=getSupportActionBar();
        if(nativeActionBar!=null)nativeActionBar.hide();
        // Android 15/16 target SDK 35+ enforces edge-to-edge. Capacitor StatusBar
        // overlaysWebView=false alone cannot keep the app below the system bar.
        if (Build.VERSION.SDK_INT >= 35) {
            // Keep the Android system status bar entirely outside the WebView.
            // Its native light strip remains visible while HTML scrolls below it.
            View content = findViewById(android.R.id.content);
            View web = getBridge().getWebView();
            content.setBackgroundColor(Color.rgb(241, 250, 248));
            web.setBackgroundColor(Color.rgb(241, 250, 248));
            ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.statusBars() |
                    WindowInsetsCompat.Type.displayCutout());
                if (view.getPaddingTop() != bars.top) {
                    view.setPadding(view.getPaddingLeft(), bars.top,
                        view.getPaddingRight(), view.getPaddingBottom());
                }
                return insets;
            });
            ViewCompat.requestApplyInsets(content);
        }
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
# Official PaddlePaddle UVDoc ONNX mobile CPU backend (verified source + SHA-256).
# Kept separate from CameraX dependencies: upgrades of existing Android projects
# must receive ONNX Runtime even if the CameraX block already exists.
if($gradleText -notmatch 'com\.microsoft\.onnxruntime:onnxruntime-android:') {
  $uvRuntime="    implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.31.1'"
  $gradleText=[regex]::Replace($gradleText,'dependencies\s*\{',"dependencies {`r`n$uvRuntime",1)
}
$gradleText=$gradleText.Replace("getDefaultProguardFile('proguard-android.txt')","getDefaultProguardFile('proguard-android-optimize.txt')")
[System.IO.File]::WriteAllText($gradle,$gradleText,[System.Text.UTF8Encoding]::new($false))

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
    <item name="android:windowBackground">#F4F9FF</item>
    <item name="android:statusBarColor">#FFFFFF</item>
    <item name="android:navigationBarColor">#F3F8FF</item>
    <item name="android:windowLightStatusBar">true</item>
  </style>
</resources>
'@
[IO.File]::WriteAllText($themeFile,$themeXml,[Text.UTF8Encoding]::new($false))

$manifest=Join-Path $android 'app\src\main\AndroidManifest.xml'
$m=[System.IO.File]::ReadAllText($manifest)
# Narrow Android package visibility: document viewers only, no QUERY_ALL_PACKAGES.
if($m -notmatch 'android.intent.action.VIEW'){
  $viewIntent=@'
    <intent>
      <action android:name="android.intent.action.VIEW" />
      <data android:mimeType="*/*" />
    </intent>
'@
  if($m -match '<queries(?:\s[^>]*)?>'){
    $m=[regex]::Replace($m,'(<queries(?:\s[^>]*)?>)',('$1' + "`r`n" + $viewIntent),1)
  }else{
    $m=$m.Replace('<application',('<queries>' + "`r`n" + $viewIntent +
       "`r`n" + '</queries>' + "`r`n" + '<application'))
  }
}
if($m -notmatch 'android\.permission\.CAMERA') {
 $m=$m.Replace('<application','<uses-permission android:name="android.permission.CAMERA" />' + "`r`n    " + '<uses-feature android:name="android.hardware.camera" android:required="false" />' + "`r`n    " + '<application')
}
if($m -notmatch 'RivoLiveScannerActivity') {
 $m=$m.Replace('</application>','    <activity android:name=".RivoLiveScannerActivity" android:exported="false" android:screenOrientation="portrait" />' + "`r`n    " + '</application>')
}
if($m -notmatch 'com\.ribhlab\.rivoscan\.rivoscan\.share') {
 $provider=@'
    <provider android:name="androidx.core.content.FileProvider"
      android:authorities="com.ribhlab.rivoscan.rivoscan.share"
      android:exported="false" android:grantUriPermissions="true">
      <meta-data android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/rivoscan_share_paths" />
    </provider>
'@
 $m=$m.Replace('</application>',$provider + [Environment]::NewLine + '</application>')
}
# Temporary JPG sharing: Android FileProvider grants read access from app cache.
# It NEVER publishes a duplicate JPEG in Documents/RivoScan.
$shareXml=Join-Path $android 'app\src\main\res\xml\rivoscan_share_paths.xml'
New-Item -ItemType Directory -Path (Split-Path -Parent $shareXml) -Force | Out-Null
$sharePaths=@'
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
  <cache-path name="rivoscan_shared_jpg" path="rivo-shared-jpg/" />
</paths>
'@
[IO.File]::WriteAllText($shareXml,$sharePaths,[Text.UTF8Encoding]::new($false))

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
[System.IO.File]::WriteAllText($manifest,$m,[System.Text.UTF8Encoding]::new($false))
& (Join-Path $root 'apply-rivoscan-branding.ps1')
& (Join-Path $root 'configure-play-debug-symbols.ps1')
Write-Host 'RivoScan live edge camera + manual crop + gallery import integrated into Android.' -ForegroundColor Green
