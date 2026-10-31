# Safely rebuild and update the user's existing RivoScan installation.
# Does not uninstall or clear app data.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
function Assert-Code([string]$label) {
  if($LASTEXITCODE -ne 0){throw "$label failed (exit code $LASTEXITCODE)."}
}
try {
  $repair = Join-Path $root "repair-rivoscan-android.ps1"
  if(-not (Test-Path -LiteralPath $repair)){throw "Repair script missing: $repair"}
  Write-Host "RivoScan: rebuilding complete Android APK including native scanner and updated launcher..." -ForegroundColor Cyan
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $repair
  Assert-Code "Android rebuild"
  $apk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"
  if(-not (Test-Path -LiteralPath $apk)){throw "New debug APK not found: $apk"}

  $adbCandidates = @()
  if($env:ANDROID_HOME){$adbCandidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe")}
  if($env:ANDROID_SDK_ROOT){$adbCandidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe")}
  if($env:LOCALAPPDATA){$adbCandidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")}
  $adbCommand=Get-Command adb.exe -ErrorAction SilentlyContinue
  if($adbCommand){$adbCandidates += $adbCommand.Source}
  $adb = $adbCandidates | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
  if(-not $adb){throw "adb.exe not found. Install Android SDK Platform Tools or use Android Studio Run."}
  Write-Host "Using Android Debug Bridge: $adb" -ForegroundColor Cyan
  & $adb start-server | Out-Host
  Assert-Code "ADB server startup"
  $output = & $adb devices
  Assert-Code "ADB devices"
  $serials = @($output | ForEach-Object {
    if($_ -match '^\s*([^\s]+)\s+device(?:\s|$)'){$matches[1]}
  })
  if($serials.Count -eq 0) {
    throw "No Android phone connected and authorized. Connect Samsung via Wi-Fi debugging or USB and approve the prompt."
  }
  $samsung = @()
  foreach($serial in $serials) {
    $model = ((& $adb -s $serial shell getprop ro.product.model) -join "").Trim()
    if($LASTEXITCODE -eq 0 -and $model -like "*SM-S908B*"){$samsung += $serial}
  }
  if($samsung.Count -ne 1){
    throw "Expected one online Samsung SM-S908B but found $($samsung.Count). Devices: $($serials -join ', '). Connect just the target Samsung and retry."
  }
  $serial=$samsung[0]
  function Get-RivoVersion {
    $details=@(& $adb -s $serial shell dumpsys package com.ribhlab.rivoscan)
    if($LASTEXITCODE -ne 0 -or -not ($details -match 'versionName=')) { return '<not installed>' }
    $code=($details | Select-String -Pattern 'versionCode=\d+' | Select-Object -First 1)
    $name=($details | Select-String -Pattern 'versionName=\S+' | Select-Object -First 1)
    if(-not $code -or -not $name) { return '<version not detected>' }
    return ($name.Matches[0].Value + ' / ' + $code.Matches[0].Value)
  }
  $before=Get-RivoVersion
  Write-Host "BEFORE install: $before" -ForegroundColor Yellow
  Write-Host "Samsung detected ($serial). Updating RivoScan in place, preserving app data..." -ForegroundColor Cyan
  $result = & $adb -s $serial install -r $apk 2>&1
  $code = $LASTEXITCODE
  $result | Out-Host
  if($code -ne 0 -or -not ($result -match '^Success$')) {
    throw "Android installation failed. If INSTALL_FAILED_UPDATE_INCOMPATIBLE appears, the old app uses another signing key. DO NOT uninstall before backing up RivoScan documents."
  }
  $after=Get-RivoVersion
  Write-Host "AFTER install: $after" -ForegroundColor Green
  if($after -notmatch 'versionName=0\.7\.0' -or $after -notmatch 'versionCode=7(?:\D|$)') {
    throw "Samsung does not report RivoScan v0.7.0 / versionCode 7 after installation. DO NOT uninstall or clear app data. Check the APK build version and install output above."
  }
  Write-Host "VERIFIED: Samsung has the newly installed RivoScan 0.7.0 package." -ForegroundColor Green
  & $adb -s $serial shell am start -n "com.ribhlab.rivoscan/.MainActivity" | Out-Host
  Assert-Code "Launching RivoScan"
  Write-Host ""
  Write-Host "SUCCESS: New RivoScan is installed and started on Samsung SM-S908B. The app launcher now uses the new scanner artwork." -ForegroundColor Green
  Write-Host "If One UI shows a cached shortcut, remove ONLY that Home Screen shortcut and add RivoScan again from the apps list." -ForegroundColor Yellow
  exit 0
} catch {
  Write-Host ""
  Write-Host ("INSTALL STOPPED: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
