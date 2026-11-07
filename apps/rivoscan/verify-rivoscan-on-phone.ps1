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
  $list=@(& $adb devices -l)
  if($LASTEXITCODE -ne 0){throw 'ADB devices query failed.'}
  $online=@($list|ForEach-Object{
    if($_ -match '^\s*(\S+)\s+device(?:\s|$)'){$matches[1]}
  })
  if($DeviceSerial -and $online -contains $DeviceSerial){$serial=$DeviceSerial}
  elseif(-not $DeviceSerial -and $online.Count -eq 1){$serial=$online[0]}
  else{throw 'Connect one authorized device, or specify an online -DeviceSerial.'}
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
    $paths=@(& $adb -s $serial shell pm path $packageId)
    if($LASTEXITCODE -ne 0){throw ('Cannot inspect '+$packageId)}
    if(@($paths|Where-Object{$_ -match '^package:/'}).Count -eq 0){
      Write-Host ($app.Label+': Not installed | '+$packageId) -ForegroundColor Yellow
      continue
    }
    $info=((& $adb -s $serial shell dumpsys package $packageId)|Out-String)
    if($LASTEXITCODE -ne 0){throw ('Cannot read version of '+$packageId)}
    $versionCode=[regex]::Match($info,'versionCode=(\d+)')
    $versionName=[regex]::Match($info,'versionName=(\S+)')
    if(-not $versionCode.Success -or -not $versionName.Success){throw ('Unreadable version for '+$packageId)}
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
