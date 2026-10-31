# Safe deployment on any compatible Android device accessible through adb.
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
    throw "No Android phone connected and authorized. Connect your phone via USB or wireless debugging and approve the prompt."
  }
  $targetSerial=$env:RIVOSCAN_DEVICE_SERIAL
  if($targetSerial) {
    $targetSerial=$targetSerial.Trim()
    if($serials -notcontains $targetSerial) {
      throw "Selected Android device $targetSerial is not connected/authorized. Online devices: $($serials -join ', ')."
    }
    $serial=$targetSerial
  } elseif($serials.Count -eq 1) {
    $serial=$serials[0]
  } else {
    throw "Multiple Android devices are connected: $($serials -join ', '). Set the RIVOSCAN_DEVICE_SERIAL environment variable to the target device ID and retry to avoid installing to the wrong phone."
  }
  $model = ((& $adb -s $serial shell getprop ro.product.model) -join "").Trim()
  if($LASTEXITCODE -ne 0) { throw "Unable to read Android device model." }
  $sdk = ((& $adb -s $serial shell getprop ro.build.version.sdk) -join "").Trim()
  if($LASTEXITCODE -ne 0) { throw "Unable to read Android SDK version." }
  if(-not $model) { $model="Android device" }
  Write-Host "Selected: $model ($serial), Android SDK $sdk" -ForegroundColor Cyan
  # Read the versionCode from the ACTUAL APK (not a guessed release number
  # or stale Gradle settings). Refuse installation when this cannot be verified.
  $sdkRoots=@()
  foreach($path in @($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT)) {
    if(-not [string]::IsNullOrWhiteSpace($path)) { $sdkRoots+= $path }
  }
  if($env:LOCALAPPDATA) { $sdkRoots+=(Join-Path $env:LOCALAPPDATA "Android\Sdk") }
  $aapt=$null
  foreach($sdkRoot in @($sdkRoots | Select-Object -Unique)) {
    $toolsDir=Join-Path $sdkRoot "build-tools"
    if(-not (Test-Path -LiteralPath $toolsDir -PathType Container)) { continue }
    $folders=@(Get-ChildItem -LiteralPath $toolsDir -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending)
    foreach($folder in $folders) {
      $candidate=Join-Path $folder.FullName "aapt.exe"
      if(Test-Path -LiteralPath $candidate) { $aapt=$candidate; break }
    }
    if($aapt) { break }
  }
  if(-not $aapt) {
    $cmd=Get-Command aapt.exe -ErrorAction SilentlyContinue
    if($cmd) { $aapt=$cmd.Source }
  }
  if(-not $aapt) {
    throw "Cannot verify APK version: Android SDK aapt.exe not found (SDK Build-Tools). Installation cancelled to prevent downgrades."
  }
  $apkDetails=@(& $aapt dump badging $apk 2>&1)
  if($LASTEXITCODE -ne 0) { throw "Could not inspect APK manifest with aapt. Installation cancelled without touching the phone." }
  $packageLine=(@($apkDetails | Where-Object { $_ -match "^package:\s" } | Select-Object -First 1) -join "")
  if($packageLine -notmatch "name='([^']+)'") { throw "APK package ID unreadable. Refusing unsafe installation." }
  $apkPackage=$matches[1]
  if($apkPackage -ne "com.ribhlab.rivoscan") { throw "Wrong APK package $apkPackage. Refusing installation." }
  if($packageLine -notmatch "versionCode='(\d+)'") { throw "APK versionCode unreadable. Refusing unsafe installation." }
  $apkVersionCode=[long]$matches[1]
  if($packageLine -notmatch "versionName='([^']+)'") { throw "APK versionName unreadable. Refusing unsafe installation." }
  $apkVersionName=$matches[1]
  Write-Host "New APK: RivoScan v$apkVersionName / versionCode=$apkVersionCode" -ForegroundColor Cyan

  # pm path distinguishes an absent package from a malformed dumpsys result.
  # If an installed version cannot be read, stop instead of guessing.
  function Get-InstalledRivo {
    $location=@(& $adb -s $serial shell pm path com.ribhlab.rivoscan 2>&1)
    if($LASTEXITCODE -ne 0) { throw "Cannot inspect installed RivoScan. Installation cancelled to avoid accidental rollback." }
    if(-not ($location -match "^package:")) {
      return [pscustomobject]@{ Installed=$false; VersionCode=$null; VersionName=$null }
    }
    $details=((& $adb -s $serial shell dumpsys package com.ribhlab.rivoscan 2>&1) | Out-String)
    if($LASTEXITCODE -ne 0 -or
       $details -notmatch "versionCode=(\d+)" -or
       $details -notmatch "versionName=(\S+)") {
      throw "Installed RivoScan version cannot be verified. Refusing installation; your data was not changed."
    }
    $codeMatch=[regex]::Match($details,"versionCode=(\d+)")
    $nameMatch=[regex]::Match($details,"versionName=(\S+)")
    return [pscustomobject]@{
      Installed=$true
      VersionCode=[long]$codeMatch.Groups[1].Value
      VersionName=$nameMatch.Groups[1].Value
    }
  }
  $installed=Get-InstalledRivo
  if($installed.Installed) {
    Write-Host "Currently installed: RivoScan v$($installed.VersionName) / versionCode=$($installed.VersionCode)" -ForegroundColor Yellow
    if($installed.VersionCode -gt $apkVersionCode) {
      Write-Host "SAFE SKIP: The phone already has a NEWER RivoScan. No downgrade, uninstall or data clearing was attempted." -ForegroundColor Green
      exit 0
    }
    if($installed.VersionCode -eq $apkVersionCode -and $env:RIVOSCAN_REINSTALL_SAME_VERSION -ne "1") {
      Write-Host "SAFE SKIP: The phone has the SAME versionCode. To intentionally reinstall the same release (without uninstalling), set RIVOSCAN_REINSTALL_SAME_VERSION=1." -ForegroundColor Yellow
      exit 0
    }
  } else {
    Write-Host "RivoScan is not installed: this is a first installation." -ForegroundColor Cyan
  }

  Write-Host "Updating RivoScan on $model ($serial) with verified APK, preserving app data..." -ForegroundColor Cyan
  # Android itself also rejects downgrades; deliberately NO -d, uninstall or pm clear.
  $result = & $adb -s $serial install -r $apk 2>&1
  $installCode = $LASTEXITCODE
  $result | Out-Host
  if($installCode -ne 0 -or -not ($result -match '^Success  Write-Host "VERIFIED: $model has the newly installed RivoScan 0.18.1 package." -ForegroundColor Green
  & $adb -s $serial shell am start -n "com.ribhlab.rivoscan/.MainActivity" | Out-Host
  Assert-Code "Launching RivoScan"
  Write-Host ""
  Write-Host "SUCCESS: RivoScan installed and started on $model ($serial)." -ForegroundColor Green
  Write-Host "If the launcher shows a cached old shortcut, remove ONLY that Home Screen shortcut and add RivoScan again from the app drawer. Do not uninstall to fix an icon." -ForegroundColor Yellow
  exit 0
} catch {
  Write-Host ""
  Write-Host ("INSTALL STOPPED: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
)) {
    throw "Android installation failed. DO NOT uninstall or clear app data. If signature differs (INSTALL_FAILED_UPDATE_INCOMPATIBLE), use a matching signing key."
  }
  $after=Get-InstalledRivo
  if(-not $after.Installed -or $after.VersionCode -ne $apkVersionCode -or $after.VersionName -ne $apkVersionName) {
    throw "Installed APK verification FAILED: expected v$apkVersionName/code $apkVersionCode. Do not uninstall/clear app data."
  }
  Write-Host "AFTER install: v$($after.VersionName) / versionCode=$($after.VersionCode)" -ForegroundColor Green
  Write-Host "VERIFIED: $model has the newly installed RivoScan 0.18.1 package." -ForegroundColor Green
  & $adb -s $serial shell am start -n "com.ribhlab.rivoscan/.MainActivity" | Out-Host
  Assert-Code "Launching RivoScan"
  Write-Host ""
  Write-Host "SUCCESS: RivoScan installed and started on $model ($serial)." -ForegroundColor Green
  Write-Host "If the launcher shows a cached old shortcut, remove ONLY that Home Screen shortcut and add RivoScan again from the app drawer. Do not uninstall to fix an icon." -ForegroundColor Yellow
  exit 0
} catch {
  Write-Host ""
  Write-Host ("INSTALL STOPPED: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
