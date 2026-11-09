# Safe deployment on any compatible Android device accessible through adb.
# Does not uninstall or clear app data.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
function Assert-Code([string]$label) {
  if($LASTEXITCODE -ne 0){throw "$label failed (exit code $LASTEXITCODE)."}
}
try {
  # Always build the newest exact RivoScan branch; never overwrite user changes.
  $git=Get-Command git.exe -ErrorAction SilentlyContinue
  if(-not $git){throw "Git is required to update source before installing. Phone unchanged."}
  $checkoutRoot=((& git.exe -C $root rev-parse --show-toplevel 2>&1) | Out-String).Trim()
  if($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $checkoutRoot -PathType Container)){
    throw "Not a Git checkout. Refusing to install unverified/old source." }
  $releaseBranch="feat/rivoscan-android-beta"
  $dirty=@(& git.exe -C $checkoutRoot status --porcelain --untracked-files=no)
  Assert-Code "Inspect source changes"
  if($dirty.Count -gt 0){throw "Tracked local files modified. Commit or stash them before updating; no files overwritten."}
  Write-Host "Checking latest origin/$releaseBranch..." -ForegroundColor Cyan
  & git.exe -C $checkoutRoot fetch --no-tags origin "refs/heads/$($releaseBranch):refs/remotes/origin/$($releaseBranch)" | Out-Host
  Assert-Code "Fetch RivoScan release"
  $current=((& git.exe -C $checkoutRoot branch --show-current) | Out-String).Trim()
  Assert-Code "Inspect branch"
  if($current -ne $releaseBranch){
    & git.exe -C $checkoutRoot show-ref --verify --quiet "refs/heads/$releaseBranch"
    if($LASTEXITCODE -eq 0){
      & git.exe -C $checkoutRoot switch $releaseBranch | Out-Host
    }else{
      & git.exe -C $checkoutRoot switch --track -c $releaseBranch "origin/$releaseBranch" | Out-Host
    }
    Assert-Code "Switch to latest RivoScan branch"
  }
  & git.exe -C $checkoutRoot merge --ff-only "refs/remotes/origin/$releaseBranch" | Out-Host
  Assert-Code "Update RivoScan source"
  $localCommit=((& git.exe -C $checkoutRoot rev-parse HEAD) | Out-String).Trim()
  $remoteCommit=((& git.exe -C $checkoutRoot rev-parse "refs/remotes/origin/$releaseBranch") | Out-String).Trim()
  Assert-Code "Verify remote revision"
  if($localCommit -ne $remoteCommit){throw "Local checkout does not equal latest GitHub commit. Stale install refused."}
  $versionText=[IO.File]::ReadAllText((Join-Path $root "rivoscan-version.properties"))
  $codeMatch=[regex]::Match($versionText,'(?m)^versionCode=(\d+)\s*$')
  $nameMatch=[regex]::Match($versionText,'(?m)^versionName=([0-9]+\.[0-9]+\.[0-9]+)\s*$')
  if(-not $codeMatch.Success -or -not $nameMatch.Success){throw "Invalid source version manifest."}
  $sourceCode=[long]$codeMatch.Groups[1].Value
  $sourceName=$nameMatch.Groups[1].Value
  $npmName=(Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json).version
  if($sourceCode -lt 103 -or $sourceName -ne $npmName){
    throw "RivoScan build is older than code 103, or versions disagree. Stale install refused." }
  Write-Host "VERIFIED LATEST SOURCE v$sourceName / code $sourceCode / $($localCommit.Substring(0,12))" -ForegroundColor Green
  # Inspect the phone version BEFORE building, never downgrade.
  $versionGuard=Join-Path $root 'sync-rivoscan-device-version.ps1'
  if(-not (Test-Path -LiteralPath $versionGuard)){throw 'Missing RivoScan safe debug version preflight.'}
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $versionGuard
  Assert-Code 'Inspect phone versionCode and prepare a higher debug code'
  $repair = Join-Path $root "repair-rivoscan-android.ps1"
  if(-not (Test-Path -LiteralPath $repair)){throw "Repair script missing: $repair"}
  Write-Host "RivoScan: rebuilding complete Android APK including native scanner and updated launcher..." -ForegroundColor Cyan
  # An Android Studio production session must NEVER leak live ad settings into QA.
  # This script always builds debug with Google-safe demo IDs, not revenue ads.
  $previousRivoProduction=$env:RIVOSCAN_ADMOB_PRODUCTION
  $previousViteProduction=$env:VITE_RIVOSCAN_ADMOB_PRODUCTION
  $env:RIVOSCAN_ADMOB_PRODUCTION='false'
  $env:VITE_RIVOSCAN_ADMOB_PRODUCTION='false'
  try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $repair
    Assert-Code "Android rebuild"
  } finally {
    $env:RIVOSCAN_ADMOB_PRODUCTION=$previousRivoProduction
    $env:VITE_RIVOSCAN_ADMOB_PRODUCTION=$previousViteProduction
  }
  # A branch update arriving during the native build must not yield a stale APK.
  & git.exe -C $checkoutRoot fetch --no-tags origin "refs/heads/$($releaseBranch):refs/remotes/origin/$($releaseBranch)" | Out-Host
  Assert-Code "Refresh latest RivoScan revision after build"
  $latest=((& git.exe -C $checkoutRoot rev-parse "refs/remotes/origin/$releaseBranch") | Out-String).Trim()
  Assert-Code "Verify latest revision after build"
  if($latest -ne $localCommit){
    throw "A NEWER RivoScan was published during compilation. Refusing stale APK: rerun the same installer."
  }
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
  # mDNS Wireless Debugging serials may contain spaces, e.g. '(2)'.
  # Capture the complete serial before its ADB status column.
  $serials = @($output | ForEach-Object {
    if($_ -match '^\s*(.+?)\s+device(?:\s|$)'){$matches[1]}
  })
  if($serials.Count -eq 0) {
    throw "No Android phone connected and authorized. Connect your phone via USB or wireless debugging and approve the prompt."
  }
  $targetSerial=$env:RIVOSCAN_DEVICE_SERIAL
  if($targetSerial) {
    $targetSerial=$targetSerial.Trim()
    if($serials -notcontains $targetSerial) {
      if($serials.Count -eq 1){
        Write-Host "Ignoring old/offline RIVOSCAN_DEVICE_SERIAL $targetSerial; using the only connected phone $($serials[0])." -ForegroundColor Yellow
        $serial=$serials[0]
      } else {
        throw "Selected Android device $targetSerial is offline. Online devices: $($serials -join ', '). Set a current RIVOSCAN_DEVICE_SERIAL."
      }
    } else {
      $serial=$targetSerial
    }
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
  if($apkPackage -ne "com.ribhlab.rivoscan.debug") { throw "Wrong APK package $apkPackage. Refusing installation." }
  if($packageLine -notmatch "versionCode='(\d+)'") { throw "APK versionCode unreadable. Refusing unsafe installation." }
  $apkVersionCode=[long]$matches[1]
  if($packageLine -notmatch "versionName='([^']+)'") { throw "APK versionName unreadable. Refusing unsafe installation." }
  $apkVersionName=$matches[1]
  # DEBUG code can be higher than canonical source code; still reject stale APKs.
  $localDebug=Join-Path $root 'rivoscan-device-version.properties'
  [long]$minDebugCode=$sourceCode
  if(Test-Path -LiteralPath $localDebug){
    $matchDebug=[regex]::Match([IO.File]::ReadAllText($localDebug),'(?m)^versionCode=(\d+)\s*$')
    if(-not $matchDebug.Success){throw 'Invalid local debug versionCode.'}
    $minDebugCode=[Math]::Max($minDebugCode,[long]$matchDebug.Groups[1].Value)
  }
  if($apkVersionCode -lt $minDebugCode -or $apkVersionName -ne $sourceName){
    throw "APK is older than the locally verified debug version. Refusing installation."
  }
  Write-Host "New APK: RivoScan v$apkVersionName / versionCode=$apkVersionCode" -ForegroundColor Cyan

  # pm path distinguishes an absent package from a malformed dumpsys result.
  # If an installed version cannot be read, stop instead of guessing.
  function Get-InstalledRivo {
    $location=@(& $adb -s $serial shell pm path com.ribhlab.rivoscan.debug 2>&1)
    $pathExit=$LASTEXITCODE
    if($pathExit -ne 0 -or -not ($location -match "^package:")) {
      # Some Samsung/Android 16 package managers return non-zero for "pm path"
      # when the app is missing. List exact installed package as fallback.
      $location=@(& $adb -s $serial shell pm list packages com.ribhlab.rivoscan.debug 2>&1)
      if($LASTEXITCODE -ne 0) {
        throw "Cannot inspect installed package: pm path and pm list packages both failed. No phone data changed."
      }
    }
    $foundApkPath=@($location | Where-Object { $_ -match '^package:/' }).Count -gt 0
    $foundExactPackage=@($location | Where-Object { $_.Trim() -eq 'package:com.ribhlab.rivoscan.debug' }).Count -gt 0
    if(-not ($foundApkPath -or $foundExactPackage)) {
      return [pscustomobject]@{ Installed=$false; VersionCode=$null; VersionName=$null }
    }
    $details=((& $adb -s $serial shell dumpsys package com.ribhlab.rivoscan.debug 2>&1) | Out-String)
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
    if($installed.VersionCode -ge $apkVersionCode) {
      throw "Installed versionCode is not lower than new APK. No downgrade/uninstall was attempted. Rerun to allocate a higher debug code."
    }
  } else {
    Write-Host "RivoScan is not installed: this is a first installation." -ForegroundColor Cyan
  }

  Write-Host "Updating RivoScan on $model ($serial) with verified APK, preserving app data..." -ForegroundColor Cyan
  # Android itself rejects downgrades too: deliberately NO -d, uninstall or pm clear.
  $result = @(& $adb -s $serial install -r $apk 2>&1)
  $installCode = $LASTEXITCODE
  $result | Out-Host
  if($installCode -ne 0 -or -not ($result -match '^Success$')) {
    throw "Android installation failed. DO NOT uninstall or clear app data. If the signature differs (INSTALL_FAILED_UPDATE_INCOMPATIBLE), use the same signing key."
  }
  $after=Get-InstalledRivo
  if(-not $after.Installed -or $after.VersionCode -ne $apkVersionCode -or $after.VersionName -ne $apkVersionName) {
    throw "Installed APK verification FAILED: expected v$apkVersionName/code $apkVersionCode. Do not uninstall/clear app data."
  }
  Write-Host "AFTER install: v$($after.VersionName) / versionCode=$($after.VersionCode)" -ForegroundColor Green
  if($after.VersionCode -lt 103){
    throw "The phone still reports an OLD build. Installation is NOT successful."
  }
  Write-Host "VERIFIED: $model has newly installed RivoScan v$apkVersionName / code $apkVersionCode." -ForegroundColor Green
  & $adb -s $serial shell am start -n "com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.RivoComposeActivity" | Out-Host
  Assert-Code "Launching RivoScan Material 3 Kotlin home"
  Write-Host ""
  Write-Host "SUCCESS: RivoScan updated and started on $model ($serial)." -ForegroundColor Green
  Write-Host "If the launcher shows a cached old shortcut, remove ONLY that Home Screen shortcut and add RivoScan again from the app drawer. Never uninstall to fix an icon." -ForegroundColor Yellow
  exit 0
} catch {
  Write-Host ""
  Write-Host ("INSTALL STOPPED: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
}
