# Install an APK manually signed with Android Studio > Generate Signed Bundle/APK > APK > Release.
# Check package, source version, signer and user consent; NEVER uninstall or clear app data.
[CmdletBinding()]
param([string]$ApkPath='', [string]$DeviceSerial='')
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$id='com.ribhlab.rivoscan'
function Check([string]$action){if($LASTEXITCODE -ne 0){throw "$action failed (exit $LASTEXITCODE)."}}
function Tool([string]$sdk,[string]$name){
  $p=Join-Path $sdk 'build-tools'
  if(-not (Test-Path -LiteralPath $p -PathType Container)){throw 'Android SDK build-tools not found.'}
  foreach($d in @(Get-ChildItem $p -Directory|Sort-Object Name -Descending)){
    $f=Join-Path $d.FullName $name
    if(Test-Path -LiteralPath $f -PathType Leaf){return $f}
  }
  throw ('Missing Android SDK tool '+$name)
}
function Signature([string]$signer,[string]$apk){
  $out=((& $signer verify --print-certs $apk 2>&1)|Out-String)
  Check 'Verify APK certificate'
  $m=[regex]::Match($out,'(?im)^Signer #1 certificate SHA-256 digest:\s*([a-f0-9:]+)\s*$')
  if(-not $m.Success){throw 'No reliable APK signing certificate found.'}
  return ($m.Groups[1].Value -replace ':','').ToLowerInvariant()
}
try{
  if(-not $ApkPath){$ApkPath=Read-Host 'Paste full path of the APK signed in Android Studio (Release, NOT Debug)'}
  $ApkPath=$ApkPath.Trim().Trim('"')
  if(-not $ApkPath){throw 'Missing signed APK path.'}
  $ApkPath=(Resolve-Path -LiteralPath $ApkPath -ErrorAction Stop).Path
  if([IO.Path]::GetExtension($ApkPath).ToLowerInvariant() -ne '.apk' -or $ApkPath -match '(?i)debug|unsigned'){
    throw 'Choose a signed Release APK (.apk), not Debug, unsigned or AAB.'
  }
  $sdkCandidates=@($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT)
  if($env:LOCALAPPDATA){$sdkCandidates+=(Join-Path $env:LOCALAPPDATA 'Android\Sdk')}
  $sdk=$sdkCandidates|Where-Object{$_ -and (Test-Path -LiteralPath $_ -PathType Container)}|Select-Object -First 1
  if(-not $sdk){throw 'Android SDK not found.'}
  $adb=Join-Path $sdk 'platform-tools\adb.exe'
  if(-not (Test-Path -LiteralPath $adb)){throw 'ADB executable not found.'}
  $aapt=Tool $sdk 'aapt.exe'
  $signer=Tool $sdk 'apksigner.bat'
  $badging=((& $aapt dump badging $ApkPath 2>&1)|Out-String)
  Check 'Read APK package and version'
  $m=[regex]::Match($badging,"(?m)^package:\s+name='([^']+)'\s+versionCode='(\d+)'\s+versionName='([^']+)'")
  if(-not $m.Success){throw 'APK metadata unreadable.'}
  $pkg=$m.Groups[1].Value;$code=[long]$m.Groups[2].Value;$version=$m.Groups[3].Value
  if($pkg -ne $id){throw ('WRONG APK: '+$pkg+'; Production is '+$id)}
  $props=[IO.File]::ReadAllText((Join-Path $root 'rivoscan-version.properties'))
  $src=[regex]::Match($props,'(?m)^versionCode=(\d+)\s*$')
  if(-not $src.Success){throw 'Source version metadata missing.'}
  $sourceCode=[long]$src.Groups[1].Value
  if($code -lt 103 -or $code -ne $sourceCode){
    throw "APK code $code is not current Production code $sourceCode. Generate a fresh signed Release APK."
  }
  $newSign=Signature $signer $ApkPath
  Write-Host "SIGNED PRODUCTION VERIFIED: $version / code $code" -ForegroundColor Green
  $list=@(& $adb devices -l);Check 'Find authorized Samsung'
  $online=@($list|ForEach-Object{if($_ -match '^\s*(\S+)\s+device(?:\s|$)'){$matches[1]}})
  if($DeviceSerial){
    if($online -notcontains $DeviceSerial){throw 'Selected Samsung is not connected or authorized.'}
    $serial=$DeviceSerial
  }elseif($online.Count -eq 1){$serial=$online[0]}
  else{throw ('Need one authorized Samsung, or -DeviceSerial. Devices: '+($online -join ', '))}
  $adbArgs=@('-s',$serial)
  $paths=@(& $adb @adbArgs shell pm path $id 2>&1)
  $base=[regex]::Match(($paths|Out-String),'(?m)^\s*package:(/\S+/base\.apk)\s*$')
  if(-not $base.Success){throw 'Installed Production APK unavailable. DO NOT uninstall. Use Google Play for updates.'}
  $current=((& $adb @adbArgs shell dumpsys package $id 2>&1)|Out-String)
  $cv=[regex]::Match($current,'versionCode=(\d+)')
  if(-not $cv.Success){throw 'Installed Production version unreadable.'}
  $oldCode=[long]$cv.Groups[1].Value
  if($oldCode -ge $code){throw "Refusing downgrade/reinstall from $oldCode to $code."}
  $tmp=Join-Path ([IO.Path]::GetTempPath()) ('rivoscan-sign-check-'+[guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($tmp)|Out-Null
  try{
    $oldApk=Join-Path $tmp 'base.apk'
    & $adb @adbArgs pull $base.Groups[1].Value $oldApk|Out-Null
    Check 'Fetch installed APK for signature comparison'
    $oldSign=Signature $signer $oldApk
    if($oldSign -ne $newSign){
      Write-Host 'SIGNATURE MISMATCH: Direct install BLOCKED. No data changed.' -ForegroundColor Yellow
      Write-Host 'Sign a Release AAB in Android Studio with the original UPLOAD key. Upload to Google Play testing; update via Play Store.' -ForegroundColor Yellow
      return
    }
    $yes=Read-Host "Signatures match. Install Release code $code over existing code $oldCode (keep data)? [y/N]"
    if($yes -notmatch '^[yY]$'){Write-Host 'Installation canceled.';return}
    & $adb @adbArgs install -r $ApkPath|Out-Host
    Check 'In-place Production update'
    $verify=((& $adb @adbArgs shell dumpsys package $id 2>&1)|Out-String)
    if($verify -notmatch ('versionCode='+$code+'\b')){throw 'Update completed but version could not be verified.'}
    Write-Host "SUCCESS: RivoScan Production $version (code $code) installed on Samsung." -ForegroundColor Green
  }finally{Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue}
}catch{Write-Host ('SAFE STOP: '+$_.Exception.Message) -ForegroundColor Red;exit 1}
