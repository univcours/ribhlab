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
  # Android Studio may ship Java 25, which Gradle 8.14.3 cannot run.
  # This Android project is built on GitHub Actions with Temurin JDK 21.
  # Explicitly inspect the compiler version instead of accepting the first JDK.
  $javaHomes = [System.Collections.Generic.List[string]]::new()
  function Add-JavaHome([string]$candidate) {
    if([string]::IsNullOrWhiteSpace($candidate)){return}
    $candidate=$candidate.Trim().Trim('"')
    if(Test-Path -LiteralPath $candidate -PathType Container){$javaHomes.Add($candidate)}
  }
  Add-JavaHome $env:JAVA_HOME
  Add-JavaHome $env:GRADLE_JAVA_HOME
  if($env:ProgramFiles){Add-JavaHome (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr')}
  if($env:LOCALAPPDATA){Add-JavaHome (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr')}
  $installedJava=Get-Command java.exe -ErrorAction SilentlyContinue
  if($installedJava -and $installedJava.Source){
    Add-JavaHome (Split-Path -Parent (Split-Path -Parent $installedJava.Source))
  }
  $javaRoots=@()
  if($env:ProgramFiles){
    $javaRoots+=@(
      (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
      (Join-Path $env:ProgramFiles 'Microsoft'),
      (Join-Path $env:ProgramFiles 'Java'),
      (Join-Path $env:ProgramFiles 'Zulu'),
      (Join-Path $env:ProgramFiles 'Amazon Corretto')
    )
  }
  if($env:LOCALAPPDATA){
    $javaRoots+=@(
      (Join-Path $env:LOCALAPPDATA 'Programs\Eclipse Adoptium'),
      (Join-Path $env:LOCALAPPDATA 'Programs\Java')
    )
  }
  if($env:USERPROFILE){
    $javaRoots+=@(
      (Join-Path $env:USERPROFILE '.jdks'),
      (Join-Path $env:USERPROFILE '.gradle\jdks')
    )
  }
  foreach($parent in $javaRoots){
    if(-not (Test-Path -LiteralPath $parent -PathType Container)){continue}
    foreach($folder in @(Get-ChildItem -LiteralPath $parent -Directory -ErrorAction SilentlyContinue)){
      Add-JavaHome $folder.FullName
    }
  }

  $selectedJavaHome=$null
  $selectedVersion=0
  foreach($candidateHome in @($javaHomes | Select-Object -Unique)){
    $javaPath=Join-Path $candidateHome 'bin\java.exe'
    $javacPath=Join-Path $candidateHome 'bin\javac.exe'
    if(-not (Test-Path -LiteralPath $javaPath) -or -not (Test-Path -LiteralPath $javacPath)){continue}
    try{
      $compilerVersion=((& $javacPath -version 2>&1) | Out-String).Trim()
      if($LASTEXITCODE -ne 0 -or $compilerVersion -notmatch '^javac\s+(\d+)'){continue}
      $major=[int]$matches[1]
      if($major -ne 21 -and $major -ne 17){
        Write-Host ("Skipping unsupported JDK " + $major + ": " + $candidateHome) -ForegroundColor Yellow
        continue
      }
      if($selectedJavaHome -eq $null -or ($major -eq 21 -and $selectedVersion -ne 21)){
        $selectedJavaHome=$candidateHome
        $selectedVersion=$major
      }
      if($selectedVersion -eq 21){break}
    } catch {
      Write-Host ("Could not inspect JDK: " + $candidateHome) -ForegroundColor Yellow
    }
  }
  if(-not $selectedJavaHome) {
    throw 'JDK 21 or 17 was not found. Java 25 from Android Studio is incompatible with Gradle 8.14.3. Install Temurin JDK 21 with: winget install --id EclipseAdoptium.Temurin.21.JDK -e --accept-package-agreements --accept-source-agreements ; then rerun this installer. No app data was changed.'
  }
  Write-Host ("Verified compatible JDK " + $selectedVersion + ": " + $selectedJavaHome) -ForegroundColor Green
  $env:JAVA_HOME=$selectedJavaHome
  $env:Path=(Join-Path $selectedJavaHome 'bin') + ';' + $env:Path
  Write-Host ("Gradle will use JAVA_HOME=" + $env:JAVA_HOME) -ForegroundColor Green
  Write-Host 'Locating Android SDK for Gradle...' -ForegroundColor Cyan
  $sdkCandidates=[System.Collections.Generic.List[string]]::new()
  foreach($value in @($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT)){
    if(-not [string]::IsNullOrWhiteSpace($value)){$sdkCandidates.Add($value)}
  }
  $localProperties=Join-Path $root 'android\local.properties'
  $oldProperties=@()
  if(Test-Path -LiteralPath $localProperties){
    $oldProperties=@(Get-Content -LiteralPath $localProperties)
    foreach($entry in $oldProperties){
      if($entry -match '^\s*sdk\.dir\s*=\s*(.+)$'){
        $sdkCandidates.Add($matches[1].Replace('\:',':').Replace('\\','\'))
      }
    }
  }
  if($env:LOCALAPPDATA){$sdkCandidates.Add((Join-Path $env:LOCALAPPDATA 'Android\Sdk'))}
  if($env:USERPROFILE){$sdkCandidates.Add((Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk'))}
  if($env:ProgramFiles){$sdkCandidates.Add((Join-Path $env:ProgramFiles 'Android\Sdk'))}
  $selectedSdk=$null
  foreach($candidate in @($sdkCandidates | Select-Object -Unique)){
    if([string]::IsNullOrWhiteSpace($candidate)){continue}
    $candidate=$candidate.Trim().Trim('"')
    if(-not (Test-Path -LiteralPath $candidate -PathType Container)){continue}
    if(-not (Test-Path -LiteralPath (Join-Path $candidate 'platforms') -PathType Container)){continue}
    $selectedSdk=(Resolve-Path -LiteralPath $candidate).Path
    break
  }
  if(-not $selectedSdk){
    throw 'Android SDK not found. In Android Studio > Settings > Languages & Frameworks > Android SDK, install an SDK platform and copy its SDK Location. Then set ANDROID_HOME to that location and retry. Normally: %LOCALAPPDATA%\Android\Sdk. The app and documents were not changed.'
  }
  $env:ANDROID_HOME=$selectedSdk
  $env:ANDROID_SDK_ROOT=$selectedSdk
  # Preserve all other local.properties values, and use forward slashes for Gradle on Windows.
  $lines=@($oldProperties | Where-Object {$_ -notmatch '^\s*sdk\.dir\s*='})
  $lines+=('sdk.dir='+$selectedSdk.Replace('\','/'))
  [System.IO.File]::WriteAllLines($localProperties,[string[]]$lines,[System.Text.UTF8Encoding]::new($false))
  Write-Host ('Verified Android SDK: '+$selectedSdk) -ForegroundColor Green
  Write-Host ('Gradle SDK configuration: '+$localProperties) -ForegroundColor Green
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
  Write-Host 'SUCCESS! RivoScan v0.23.0 built with live scanner and adaptive launcher icon.' -ForegroundColor Green
  Write-Host "APK: $apk"
  Write-Host 'Open Android Studio > Sync Project with Gradle Files > Run (app) on your connected Android phone.' -ForegroundColor Green
} catch {
  Write-Host ''
  Write-Host ('REPAIR FAILED: '+$_.Exception.Message) -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
