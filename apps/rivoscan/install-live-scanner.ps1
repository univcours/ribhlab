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
# RivoScan premium host is authored in Kotlin, never generated Java.
$kotlinSource=Join-Path $source 'MainActivity.kt'
$main=Join-Path $packageDir 'MainActivity.kt'
if(-not(Test-Path -LiteralPath $kotlinSource)){throw 'Kotlin MainActivity source missing; no unsafe Java fallback.'}
Copy-Item -LiteralPath $kotlinSource -Destination $main -Force
$premiumChrome=Join-Path $source 'RivoPremiumChrome.kt'
if(-not(Test-Path -LiteralPath $premiumChrome)){throw 'Kotlin CameraX premium chrome missing; cannot build native UI.'}
Copy-Item -LiteralPath $premiumChrome -Destination (Join-Path $packageDir 'RivoPremiumChrome.kt') -Force
# Native Kotlin Compose UI and secure route plugin. No generated Java stand-ins.
foreach($kotlinName in @('RivoComposeActivity.kt','RivoUIBridgePlugin.kt')) {
  $kotlinPath=Join-Path $source $kotlinName
  if(-not(Test-Path -LiteralPath $kotlinPath)) { throw "Native Material 3 Kotlin source missing: $kotlinName" }
  Copy-Item -LiteralPath $kotlinPath -Destination (Join-Path $packageDir $kotlinName) -Force
}

# Capacitor generates a Java stub by default; remove it so only one
# MainActivity class is compiled, without touching any other Java plugins.
$obsoleteMain=Join-Path $packageDir 'MainActivity.java'
if(Test-Path -LiteralPath $obsoleteMain){Remove-Item -LiteralPath $obsoleteMain -Force}


# Kotlin 2.3.10 supports this app's Android Gradle/Gradle combination.
# Install the Gradle compiler in the generated native project on EVERY sync,
# not just in CI; a plain Android Studio Run must compile Kotlin too.
$rootGradle=Join-Path $android 'build.gradle'
if(-not(Test-Path -LiteralPath $rootGradle)){throw 'Generated Android root build.gradle missing.'}
$rootText=[IO.File]::ReadAllText($rootGradle)
$kotlinDependency="classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.10'"
if(-not $rootText.Contains($kotlinDependency)){
  $androidPluginMatch=[regex]::Match($rootText,'classpath\s+.{1}com\.android\.tools\.build:gradle:[^\r\n]+')
  if(-not $androidPluginMatch.Success){throw 'Could not locate Android Gradle plugin for Kotlin installation.'}
  $rootText=$rootText.Insert($androidPluginMatch.Index+$androidPluginMatch.Length,
    [Environment]::NewLine + '        ' + $kotlinDependency)
  [IO.File]::WriteAllText($rootGradle,$rootText,[Text.UTF8Encoding]::new($false))
}
# Keep Kotlin Compose Compiler exactly on Kotlin's version 2.3.10.
$rootText=[IO.File]::ReadAllText($rootGradle)
$composePlugin="classpath 'org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.3.10'"
if(-not $rootText.Contains($composePlugin)) {
  $kotlinMatch=[regex]::Match($rootText,"classpath\s+['""']org\.jetbrains\.kotlin:kotlin-gradle-plugin:2\.3\.10['""']")
  if(-not $kotlinMatch.Success){throw 'Cannot locate Kotlin Gradle plugin for Compose integration.'}
  $rootText=$rootText.Insert($kotlinMatch.Index+$kotlinMatch.Length,
      [Environment]::NewLine + '        ' + $composePlugin)
  [IO.File]::WriteAllText($rootGradle,$rootText,[Text.UTF8Encoding]::new($false))
}

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
if(-not $gradleText.Contains("apply plugin: 'org.jetbrains.kotlin.android'")) {
  if(-not $gradleText.Contains("apply plugin: 'com.android.application'")){throw 'Cannot find Android application plugin to integrate Kotlin.'}
  $gradleText=$gradleText.Replace("apply plugin: 'com.android.application'",
    "apply plugin: 'com.android.application'" + [Environment]::NewLine +
    "apply plugin: 'org.jetbrains.kotlin.android'")
}
if($gradleText -notmatch 'RivoScan Kotlin JVM 17') {
  $gradleText=$gradleText.TrimEnd() + [Environment]::NewLine +
    "// RivoScan Kotlin JVM 21: match Capacitor Java compile task on JDK 21" + [Environment]::NewLine +
    "kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }" + [Environment]::NewLine
}
if(-not $gradleText.Contains("apply plugin: 'org.jetbrains.kotlin.plugin.compose'")) {
  $gradleText=$gradleText.Replace(
    "apply plugin: 'org.jetbrains.kotlin.android'",
    "apply plugin: 'org.jetbrains.kotlin.android'" + [Environment]::NewLine +
    "apply plugin: 'org.jetbrains.kotlin.plugin.compose'")
}
if($gradleText -notmatch '(?m)^\s*buildFeatures\s*\{\s*compose\s+true\s*\}') {
  $gradleText=[regex]::Replace($gradleText,'(?m)^android\s*\{',
      "android {" + [Environment]::NewLine + "    buildFeatures { compose true }",1)
}
if(-not $gradleText.Contains("androidx.compose:compose-bom:2026.04.01")) {
  $material3=@'
    implementation platform('androidx.compose:compose-bom:2026.04.01')
    implementation 'androidx.compose.material3:material3'
    implementation 'androidx.compose.foundation:foundation'
    implementation 'androidx.activity:activity-compose:1.11.0'
'@
  if($gradleText -notmatch 'dependencies\s*\{') {throw 'Android dependencies block not found for Compose.'}
  $gradleText=[regex]::Replace($gradleText,'dependencies\s*\{',
      "dependencies {" + [Environment]::NewLine + $material3,1)
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
    <item name="android:windowBackground">#F7F9FD</item>
    <item name="android:statusBarColor">#FFFFFF</item>
    <item name="android:navigationBarColor">#FFFFFF</item>
    <item name="android:windowLightStatusBar">true</item>
  </style>
  <!-- All RivoScan-owned Android camera popups use the same turquoise theme. -->
  <style name="RivoTurquoiseDialog" parent="Theme.AppCompat.Light.Dialog.Alert">
    <item name="colorAccent">#0CEBF4</item>
    <item name="android:colorAccent">#0CEBF4</item>
    <item name="android:textColorPrimary">#EAFBFF</item>
    <item name="android:windowBackground">@drawable/rivoscan_dialog_bg</item>
  </style>
</resources>
'@
[IO.File]::WriteAllText($themeFile,$themeXml,[Text.UTF8Encoding]::new($false))
$dialogDrawable=Join-Path $android 'app\src\main\res\drawable\rivoscan_dialog_bg.xml'
$dialogXML=@'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
  <solid android:color="#092641" />
  <stroke android:width="1dp" android:color="#17B5D2" />
  <corners android:radius="22dp" />
  <padding android:left="9dp" android:right="9dp"
    android:top="8dp" android:bottom="8dp" />
</shape>
'@
New-Item -ItemType Directory -Path (Split-Path -Parent $dialogDrawable) -Force | Out-Null
[IO.File]::WriteAllText($dialogDrawable,$dialogXML,[Text.UTF8Encoding]::new($false))

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
# Exactly ONE launcher: Compose. Preserve Capacitor's other intent filters.
$bridgePattern='(?s)<activity\b(?=[^>]*android:name\s*=\s*"(?:\.MainActivity|com\.ribhlab\.rivoscan\.MainActivity)")[^>]*>.*?</activity>'
$bridgeBlocks=[regex]::Matches($m,$bridgePattern)
if($bridgeBlocks.Count -ne 1){throw 'Unable to locate exactly one Capacitor bridge Activity.'}
$bridgeBlock=$bridgeBlocks[0].Value
$filters=[regex]::Matches($bridgeBlock,'(?s)<intent-filter\b[^>]*>.*?</intent-filter>')
$launcherFilters=@($filters | Where-Object {
  $_.Value.Contains('android.intent.action.MAIN') -and
  $_.Value.Contains('android.intent.category.LAUNCHER')
})
$composeAlreadyLauncher=($m -match 'android:name="\.RivoComposeActivity"')
if($launcherFilters.Count -eq 1){
  # First npx cap add android: transfer the launcher once to Compose.
  $bridgeWithoutLauncher=$bridgeBlock.Replace($launcherFilters[0].Value,'')
  $m=$m.Replace($bridgeBlock,$bridgeWithoutLauncher)
}elseif($launcherFilters.Count -eq 0 -and $composeAlreadyLauncher){
  # Subsequent npx cap sync: migration already applied, keep it intact.
  Write-Host 'RivoScan Material 3 launcher already installed; leaving manifest intact.'
}else{
  throw 'Launcher manifest is ambiguous; refusing to create duplicate icons.'
}
if(-not $composeAlreadyLauncher){
  $composeLauncher=@'
    <activity android:name=".RivoComposeActivity"
      android:exported="true" android:theme="@style/RivoScanNoActionBar">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
'@
  $m=$m.Replace('</application>',$composeLauncher + [Environment]::NewLine + '</application>')
}

[System.IO.File]::WriteAllText($manifest,$m,[System.Text.UTF8Encoding]::new($false))
& (Join-Path $root 'apply-rivoscan-branding.ps1')
& (Join-Path $root 'configure-play-debug-symbols.ps1')
Write-Host 'RivoScan live edge camera + manual crop + gallery import integrated into Android.' -ForegroundColor Green
