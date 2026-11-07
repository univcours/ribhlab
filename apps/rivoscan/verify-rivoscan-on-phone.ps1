# Read-only: compare installed RivoScan Production and DEV on one authorized phone.
param([string]$DeviceSerial='')
$ErrorActionPreference='Stop'
try {
  $candidates=@()
  foreach($sdk in @($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT)){
    if($sdk){$candidates+=(Join-Path $sdk 'platform-tools\adb.exe')}
  }
  if($env:LOCALAPPDATA){$candidates+=(Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')}
  $cmd=Get-Command adb.exe -ErrorAction SilentlyContinue
  if($cmd){$candidates+=$cmd.Source}
  $adb=$candidates|Where-Object{Test-Path -LiteralPath $_ -PathType Leaf}|Select-Object -First 1
  if(-not $adb){throw 'Android SDK adb.exe not found.'}
  Write-Host ('ADB: '+$adb) -ForegroundColor Cyan
  # Starting the local ADB server is safe: this command never modifies phone storage.
  $null=@(& $adb start-server)
  if($LASTEXITCODE -ne 0){throw 'ADB server could not start. Close any conflicting ADB process, then retry.'}
  $list=@(& $adb devices -l)
  if($LASTEXITCODE -ne 0){throw 'ADB devices query failed.'}
  Write-Host 'Connected Android devices reported by ADB:' -ForegroundColor Cyan
  $list | ForEach-Object { Write-Host $_ }
  $online=@($list|ForEach-Object{
    if($_ -match '^\s*(\S+)\s+device(?:\s|$)'){$matches[1]}
  })
  $unauthorized=@($list|ForEach-Object{
    if($_ -match '^\s*(\S+)\s+unauthorized(?:\s|$)'){$matches[1]}
  })
  $offline=@($list|ForEach-Object{
    if($_ -match '^\s*(\S+)\s+offline(?:\s|$)'){$matches[1]}
  })
  if($DeviceSerial){
    if($online -contains $DeviceSerial){$serial=$DeviceSerial}
    elseif($unauthorized -contains $DeviceSerial){
      throw ('Device '+$DeviceSerial+' is UNAUTHORIZED. Unlock Samsung and approve the USB debugging RSA prompt.')
    }elseif($offline -contains $DeviceSerial){
      throw ('Device '+$DeviceSerial+' is OFFLINE. Reconnect USB or Wireless debugging, then run adb devices -l.')
    }else{
      throw ('Device '+$DeviceSerial+' is not an authorized online device. Available: '+($online -join ', '))
    }
  }elseif($online.Count -eq 1){
    $serial=$online[0]
  }elseif($online.Count -gt 1){
    throw ('More than one authorized device. Run with -DeviceSerial followed by ONE of: '+($online -join ', '))
  }elseif($unauthorized.Count -gt 0){
    throw 'USB debugging is UNAUTHORIZED. Unlock Samsung, accept the computer RSA fingerprint prompt and rerun. No app was changed.'
  }elseif($offline.Count -gt 0){
    throw 'ADB device is OFFLINE. Reconnect the USB cable, or reconnect Wireless debugging using its current IP:port.'
  }else{
    throw 'ADB sees NO Android devices. Connect Samsung USB with USB debugging enabled, or pair Wireless debugging in Android Studio. No app was changed.'
  }
  $source=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'rivoscan-version.properties'))
  $match=[regex]::Match($source,'(?m)^versionCode=(\d+)\s*$')
  if(-not $match.Success){throw 'Source release versionCode unreadable.'}
  [long]$currentCode=[long]$match.Groups[1].Value
  Write-Host ('Device: '+$serial+' | latest source release code: '+$currentCode) -ForegroundColor Cyan
  foreach($app in @(
    @{Label='Production';Id='com.ribhlab.rivoscan'},
    @{Label='DEV';Id='com.ribhlab.rivoscan.debug'}
  )){
    $packageId=$app.Id
    # CHECK THE APK PATH FIRST: this previously detected Production code 74.
    # "pm list packages <filter>" is not authoritative on every Samsung user
    # profile and must never override a positive pm path result.
    $paths=@(& $adb -s $serial shell pm path $packageId 2>&1)
    $pathExit=$LASTEXITCODE
    $hasApkPath=@($paths | Where-Object {$_ -match '^\s*package:/'}).Count -gt 0
    $listed=@(& $adb -s $serial shell pm list packages $packageId 2>&1)
    $listExit=$LASTEXITCODE
    $listedExact=@($listed | Where-Object {
      $_.Trim() -eq ('package:'+$packageId)
    }).Count -gt 0
    $info=((& $adb -s $serial shell dumpsys package $packageId 2>&1)|Out-String)
    $dumpExit=$LASTEXITCODE
    $versionCode=[regex]::Match($info,'versionCode=(\d+)')
    $versionName=[regex]::Match($info,'versionName=(\S+)')
    $hasVersion=$dumpExit -eq 0 -and $versionCode.Success -and $versionName.Success
    if($hasApkPath) {
      if(-not $hasVersion){
        Write-Host ($app.Label+': INSTALLED (APK path confirmed), but version unreadable | '+$packageId) -ForegroundColor Yellow
        continue
      }
      if(-not $listedExact){
        Write-Host ('NOTE: pm path confirms '+$packageId+', but pm list packages does not. Trusting APK path.') -ForegroundColor Yellow
      }
    } elseif($listedExact) {
      if(-not $hasVersion){
        Write-Host ($app.Label+': INSTALLED (package list confirmed), but version unreadable | '+$packageId) -ForegroundColor Yellow
        continue
      }
      Write-Host ('NOTE: '+$packageId+' listed but pm path unavailable (exit '+$pathExit+').') -ForegroundColor Yellow
    } elseif($hasVersion) {
      # dumpsys can expose metadata invisible to the active shell user.
      Write-Host ($app.Label+': Version metadata present but APK not visible. Check Android user/work profile | '+$packageId) -ForegroundColor Yellow
      Write-Host ('  Reported metadata: '+$versionName.Groups[1].Value+' / code '+$versionCode.Groups[1].Value) -ForegroundColor Yellow
      continue
    } else {
      if($listExit -ne 0){
        Write-Host ($app.Label+': UNKNOWN: package list failed (exit '+$listExit+'). Not evidence of uninstall. | '+$packageId) -ForegroundColor Yellow
      }else{
        Write-Host ($app.Label+': Not found by ADB in active user | '+$packageId) -ForegroundColor Yellow
        Write-Host '  This is NOT proof of uninstall; verify Android user/work profile if icon still exists.' -ForegroundColor Yellow
      }
      continue
    }
    Write-Host ($app.Label+': '+$versionName.Groups[1].Value+' / code '+$versionCode.Groups[1].Value+' | '+$packageId) -ForegroundColor Green
    if($app.Label -eq 'Production' -and [long]$versionCode.Groups[1].Value -lt $currentCode){
      Write-Host 'Production is older than source; update via Google Play testing. Android Studio Run is DEV only.' -ForegroundColor Yellow
    }
  }
  Write-Host 'Read-only check completed. No app data or documents modified.' -ForegroundColor Cyan
}catch{
  Write-Host ('VERIFY STOPPED: '+$_.Exception.Message) -ForegroundColor Red
  exit 1
}
