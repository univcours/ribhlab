# Rebuild RivoScan with its native CameraX/OpenCV scanner, not only the web assets.
# Run from the GitHub checkout after pulling the feature branch.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Push-Location -LiteralPath $root
try {
  function FailIfBad([string]$step) {
    if($LASTEXITCODE -ne 0) { throw "$step failed (exit $LASTEXITCODE). See the error above." }
  }
  if(-not (Get-Command npm.cmd -ErrorAction SilentlyContinue) -or -not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js / npm is not installed or not on PATH.'
  }
  Write-Host '[1/6] Installing dependencies...' -ForegroundColor Cyan
  & npm.cmd install --no-audit --no-fund
  FailIfBad 'npm install'
  Write-Host '[2/6] Checking RivoScan JavaScript...' -ForegroundColor Cyan
  & npm.cmd run check
  FailIfBad 'JavaScript source check'
  Write-Host '[3/6] Building RivoScan web assets...' -ForegroundColor Cyan
  & npm.cmd run build
  FailIfBad 'Vite build'
  if(-not (Test-Path -LiteralPath (Join-Path $root 'android\settings.gradle'))) {
    Write-Host 'First install: generating native Android wrapper...' -ForegroundColor Cyan
    & npx.cmd cap add android
    FailIfBad 'Capacitor Android project creation'
  }
  Write-Host '[4/6] Synchronizing Capacitor Android plugins...' -ForegroundColor Cyan
  & npx.cmd cap sync android
  FailIfBad 'Capacitor sync'
  Write-Host '[5/6] Installing and VERIFYING live scanner + launcher branding...' -ForegroundColor Cyan
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'install-live-scanner.ps1')
  FailIfBad 'Native live scanner installation'
  $main=Join-Path $root 'android\app\src\main\java\com\ribhlab\rivoscan\MainActivity.java'
  $plugin=Join-Path $root 'android\app\src\main\java\com\ribhlab\rivoscan\RivoLiveScannerPlugin.java'
  $activity=Join-Path $root 'android\app\src\main\java\com\ribhlab\rivoscan\RivoLiveScannerActivity.java'
  $manifest=Join-Path $root 'android\app\src\main\AndroidManifest.xml'
  $build=Join-Path $root 'android\app\build.gradle'
  foreach($path in @($main,$plugin,$activity,$manifest,$build)) {
    if(-not (Test-Path -LiteralPath $path)) { throw "Missing required native scanner source: $path" }
  }
  if(-not ([System.IO.File]::ReadAllText($main).Contains('registerPlugin(RivoLiveScannerPlugin.class)'))) {
    throw 'RivoLiveScanner is not registered in MainActivity.java. Rebuild aborted.'
  }
  if(-not ([System.IO.File]::ReadAllText($manifest).Contains('RivoLiveScannerActivity'))) {
    throw 'Native scanner activity missing from AndroidManifest.xml. Rebuild aborted.'
  }
  if(-not ([System.IO.File]::ReadAllText($build).Contains('androidx.camera:camera-view'))) {
    throw 'CameraX dependency is missing from app/build.gradle. Rebuild aborted.'
  }
  $adaptiveIcon=Join-Path $root 'android\app\src\main\res\mipmap-anydpi-v26\ic_launcher.xml'
  $legacyIcon=Join-Path $root 'android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png'
  if(-not (Test-Path -LiteralPath $adaptiveIcon) -or -not (Test-Path -LiteralPath $legacyIcon)) {
    throw 'New RivoScan launcher resources are missing. Run apply-rivoscan-branding.ps1 and retry.'
  }
  if(-not ([System.IO.File]::ReadAllText($manifest).Contains('android:icon="@mipmap/ic_launcher"'))) {
    throw 'Android manifest still references the old launcher icon. Rebuild aborted.'
  }
  Write-Host 'PASS: CameraX scanner, adaptive launcher, and new RivoScan icon are registered.' -ForegroundColor Green
  Write-Host '[6/6] Finding Java JDK for Gradle...' -ForegroundColor Cyan
  # Windows Android Studio bundles JetBrains Runtime (Java JDK), but a plain
  # PowerShell terminal may not inherit the IDE's Gradle JDK/JAVA_HOME setting.
  $javaHomes = [System.Collections.Generic.List[string]]::new()
  if($env:JAVA_HOME) { $javaHomes.Add($env:JAVA_HOME) }
  if($env:ProgramFiles) { $javaHomes.Add((Join-Path $env:ProgramFiles 'Android\Android Studio\jbr')) }
  if($env:LOCALAPPDATA) { $javaHomes.Add((Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr')) }
  $installedJava = Get-Command java.exe -ErrorAction SilentlyContinue
  if($installedJava -and $installedJava.Source) {
    $javaHomes.Add((Split-Path -Parent (Split-Path -Parent $installedJava.Source)))
  }
  if($env:USERPROFILE) {
    $jdksRoot=Join-Path $env:USERPROFILE '.jdks'
    if(Test-Path -LiteralPath $jdksRoot) {
      @(Get-ChildItem -LiteralPath $jdksRoot -Directory -ErrorAction SilentlyContinue) | ForEach-Object { $javaHomes.Add($_.FullName) }
    }
  }
  $selectedJavaHome=$null
  foreach($candidateHome in $javaHomes) {
    if(-not $candidateHome) { continue }
    $javaPath=Join-Path $candidateHome 'bin\java.exe'
    $javacPath=Join-Path $candidateHome 'bin\javac.exe'
    if((Test-Path -LiteralPath $javaPath) -and (Test-Path -LiteralPath $javacPath)){
      $selectedJavaHome=$candidateHome
      break
    }
  }
  if(-not $selectedJavaHome) {
    throw 'Java JDK was not found. In Android Studio, open Settings > Build, Execution, Deployment > Build Tools > Gradle to locate Gradle JDK; use the JDK root (often C:\Program Files\Android\Android Studio\jbr) for JAVA_HOME. No APK was installed.'
  }
  $env:JAVA_HOME=$selectedJavaHome
  $env:Path=(Join-Path $selectedJavaHome 'bin') + ';' + $env:Path
  Write-Host ("Gradle will use JAVA_HOME=" + $env:JAVA_HOME) -ForegroundColor Green
  Write-Host 'Compiling a NEW Android debug APK including native scanner...' -ForegroundColor Cyan
  $gradle = Join-Path $root 'android\gradlew.bat'
  if(-not (Test-Path -LiteralPath $gradle)) { throw 'Gradle wrapper not found.' }
  Push-Location -LiteralPath (Join-Path $root 'android')
  try {
    & $gradle ':app:assembleDebug' '--no-daemon'
    FailIfBad 'Gradle assembleDebug'
  } finally { Pop-Location }
  $apk=Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
  if(-not (Test-Path -LiteralPath $apk)) { throw 'Gradle completed but the debug APK file is missing.' }
  Write-Host ''
  Write-Host 'SUCCESS! RivoScan v0.9 built with live scanner and new adaptive launcher icon.' -ForegroundColor Green
  Write-Host "APK: $apk"
  Write-Host 'Open Android Studio > Sync Project with Gradle Files > Run (app) on your Samsung.' -ForegroundColor Green
} catch {
  Write-Host ''
  Write-Host ('REPAIR FAILED: '+$_.Exception.Message) -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
