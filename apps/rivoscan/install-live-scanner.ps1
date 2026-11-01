# Run after npx cap add android / npx cap sync android.
# Idempotent integration into the generated Capacitor Android wrapper.
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$android=Join-Path $root 'android'
$source=Join-Path $root 'native\android'
if(-not (Test-Path (Join-Path $android 'app\build.gradle'))) { throw 'Android wrapper not found. Run npm install, npm run build, npx cap add android (first time), npx cap sync android.' }
$packageDir=Join-Path $android 'app\src\main\java\com\ribhlab\rivoscan'
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
foreach($filename in @('RivoLiveScannerPlugin.java','RivoDocumentsPlugin.java','RivoSounds.java','RivoLocale.java','RivoEdgeDetector.java','RivoCropEditor.java','RivoDocumentEnhancer.java','RivoScanPagesManager.java','RivoLiveScannerActivity.java')) {
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
        getWindow().setNavigationBarColor(Color.rgb(243, 248, 255));
        new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView())
            .setAppearanceLightStatusBars(true);
        registerPlugin(RivoLiveScannerPlugin.class);
        registerPlugin(RivoDocumentsPlugin.class);
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
            content.setBackgroundColor(Color.rgb(244, 249, 255));
            web.setBackgroundColor(Color.rgb(244, 249, 255));
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
    implementation 'org.opencv:opencv:4.12.0'
'@
if($gradleText -notmatch "androidx\.camera:camera-view:1\.6\.2") {
  if($gradleText -notmatch 'dependencies\s*\{') {throw 'Gradle dependencies section not found.'}
  $gradleText=[regex]::Replace($gradleText,'dependencies\s*\{',"dependencies {`r`n$deps",1)
}
$gradleText=$gradleText.Replace("getDefaultProguardFile('proguard-android.txt')","getDefaultProguardFile('proguard-android-optimize.txt')")
[System.IO.File]::WriteAllText($gradle,$gradleText,[System.Text.UTF8Encoding]::new($false))


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
if($m -notmatch 'android\.permission\.CAMERA') {
 $m=$m.Replace('<application','<uses-permission android:name="android.permission.CAMERA" />' + "`r`n    " + '<uses-feature android:name="android.hardware.camera" android:required="false" />' + "`r`n    " + '<application')
}
if($m -notmatch 'RivoLiveScannerActivity') {
 $m=$m.Replace('</application>','    <activity android:name=".RivoLiveScannerActivity" android:exported="false" android:screenOrientation="portrait" />' + "`r`n    " + '</application>')
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
[System.IO.File]::WriteAllText($manifest,$m,[System.Text.UTF8Encoding]::new($false))
& (Join-Path $root 'apply-rivoscan-branding.ps1')
Write-Host 'RivoScan live edge camera + manual crop + gallery import integrated into Android.' -ForegroundColor Green
