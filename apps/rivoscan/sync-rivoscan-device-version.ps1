# Generates a local DEBUG-only versionCode above the installed Android app.
# NEVER uninstalls or clears app data. Production version remains authoritative.
param([string]$DeviceSerial = '')
$ErrorActionPreference='Stop'
try {
  $root=$PSScriptRoot
  $source=[IO.File]::ReadAllText((Join-Path $root 'rivoscan-version.properties'))
  $m=[regex]::Match($source,'(?m)^versionCode=(\d+)\s*$')
  if(-not $m.Success){throw 'Invalid source versionCode.'}
  [long]$base=[long]$m.Groups[1].Value
  $adbCandidates=@()
  foreach($sdk in @($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT)){
    if(-not [string]::IsNullOrWhiteSpace($sdk)){$adbCandidates+=(Join-Path $sdk 'platform-tools\adb.exe')}
  }
  if($env:LOCALAPPDATA){$adbCandidates+=(Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')}
  $command=Get-Command adb.exe -ErrorAction SilentlyContinue
  if($command){$adbCandidates+=$command.Source}
  $adb=$adbCandidates | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1
  if(-not $adb){throw 'ADB was not found in the Android SDK.'}
  & $adb start-server | Out-Host
  if($LASTEXITCODE -ne 0){throw 'ADB server failed to start.'}
  $devices=@(& $adb devices -l)
  if($LASTEXITCODE -ne 0){throw 'ADB devices failed.'}
  $online=@($devices | ForEach-Object {
    if($_ -match '^\s*(\S+)\s+device(?:\s|$)'){$matches[1]}
  })
  $target=$DeviceSerial.Trim()
  if(-not $target){$target=[string]$env:RIVOSCAN_DEVICE_SERIAL}
  $target=$target.Trim()
  if($target -and $online -contains $target){
    $serial=$target
  }elseif($online.Count -eq 1){
    $serial=$online[0]
    if($target){Write-Host "Ignoring stale device $target; using $serial" -ForegroundColor Yellow}
  }elseif($online.Count -eq 0){
    throw 'No online authorized Android device. Cancel the uninstall prompt, authorize USB/Wireless debugging, then retry.'
  }else{
    throw "Multiple connected devices: $($online -join ', '). Use -DeviceSerial."
  }
  $pm=@(& $adb -s $serial shell pm path com.ribhlab.rivoscan 2>&1)
  if($LASTEXITCODE -ne 0){throw 'Cannot inspect RivoScan package.'}
  [long]$installed=0
  if(@($pm | Where-Object {$_ -match '^package:/'}).Count -gt 0){
    $dumpsys=((& $adb -s $serial shell dumpsys package com.ribhlab.rivoscan 2>&1) | Out-String)
    if($LASTEXITCODE -ne 0){throw 'Installed package version query failed.'}
    $code=[regex]::Match($dumpsys,'versionCode=(\d+)')
    if(-not $code.Success){throw 'Installed versionCode unreadable. No changes made.'}
    $installed=[long]$code.Groups[1].Value
  }
  $file=Join-Path $root 'rivoscan-device-version.properties'
  [long]$previous=0
  if(Test-Path -LiteralPath $file){
    $old=[regex]::Match([IO.File]::ReadAllText($file),'(?m)^versionCode=(\d+)\s*$')
    if($old.Success){$previous=[long]$old.Groups[1].Value}
  }
  [long]$new=[Math]::Max([Math]::Max($base,$previous),$installed+1)
  if($new -gt 2100000000L){throw 'versionCode too high for safe Android update.'}
  # Always write exactly two lines; avoid array-expression concatenation ambiguity.
  $value=('versionCode={0}' -f $new)
  if($value -notmatch '^versionCode=[1-9][0-9]*$'){
    throw 'Generated invalid local debug versionCode.'
  }
  $lines=[string[]]@(
    '# Generated for local debug builds only; do not commit',
    $value
  )
  [IO.File]::WriteAllLines($file,$lines,[Text.UTF8Encoding]::new($false))
  $saved=[IO.File]::ReadAllLines($file)
  if($saved.Length -ne 2 -or $saved[1] -ne $value){
    throw 'Debug version file verification failed; no APK installation attempted.'
  }
  Write-Host "Android device ${serial}: installed code $installed -> new debug code $new" -ForegroundColor Green
  exit 0
}catch{
  Write-Host ('VERSION CHECK STOPPED SAFELY: '+$_.Exception.Message) -ForegroundColor Red
  exit 1
}
