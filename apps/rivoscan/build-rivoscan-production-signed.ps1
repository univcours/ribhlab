# Build and sign a genuine RivoScan Production (Release) APK and Google Play AAB.
# NEVER creates/replaces a signing key. NEVER uninstalls, downgrades or clears data.
# If explicitly requested, tries an in-place Wi-Fi ADB update ONLY with the same
# signer certificate as the currently installed com.ribhlab.rivoscan package.
[CmdletBinding()]
param(
  [string]$Keystore = '',
  [string]$Alias = '',
  [string]$DeviceSerial = '',
  [string]$OutputDirectory = '',
  [switch]$InstallIfCompatible
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$packageId = 'com.ribhlab.rivoscan'
$oldJavaHome = $env:JAVA_HOME
$oldPath = $env:Path
$oldStorePass = $env:RIVOSCAN_RELEASE_STOREPASS
$oldKeyPass = $env:RIVOSCAN_RELEASE_KEYPASS
$storePassword = $null
$keyPassword = $null
function Assert-Success([string]$label) {
  if($LASTEXITCODE -ne 0){throw ($label + ' failed with exit code ' + $LASTEXITCODE)}
}
function Read-Secret([string]$label) {
  $secure = Read-Host $label -AsSecureString
  $ptr = [IntPtr]::Zero
  try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
  }
}
function Get-AndroidTool([string]$name,[string]$sdkRoot) {
  $buildTools = Join-Path $sdkRoot 'build-tools'
  if(-not (Test-Path -LiteralPath $buildTools)){throw 'Android SDK Build-Tools are missing.'}
  $folders = @(Get-ChildItem -LiteralPath $buildTools -Directory | Sort-Object Name -Descending)
  foreach($folder in $folders){
    $file = Join-Path $folder.FullName $name
    if(Test-Path -LiteralPath $file -PathType Leaf){return $file}
  }
  throw ('Required Android SDK executable not found: ' + $name)
}
function Get-ApkCertificateDigest([string]$apksigner,[string]$apk) {
  $lines = @(& $apksigner verify --print-certs $apk 2>&1)
  Assert-Success ('Verify APK signing of ' + $apk)
  $text = $lines | Out-String
  $m = [regex]::Match($text,'(?im)^Signer #1 certificate SHA-256 digest:\s*([a-f0-9:]+)\s*$')
  if(-not $m.Success){throw ('APK signer certificate digest not readable: ' + $apk)}
  return (($m.Groups[1].Value -replace ':','').ToLowerInvariant())
}
function Resolve-Jdk {
  $homes = [System.Collections.Generic.List[string]]::new()
  foreach($candidate in @($env:JAVA_HOME,$env:GRADLE_JAVA_HOME)){
    if($candidate){$homes.Add($candidate)}
  }
  if($env:ProgramFiles){
    $homes.Add((Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'))
    foreach($parent in @('Eclipse Adoptium','Microsoft','Java','Zulu','Amazon Corretto')){
      $p = Join-Path $env:ProgramFiles $parent
      if(Test-Path -LiteralPath $p){
        foreach($d in @(Get-ChildItem -LiteralPath $p -Directory -ErrorAction SilentlyContinue)){$homes.Add($d.FullName)}
      }
    }
  }
  if($env:USERPROFILE){
    $p = Join-Path $env:USERPROFILE '.jdks'
    if(Test-Path -LiteralPath $p){
      foreach($d in @(Get-ChildItem -LiteralPath $p -Directory -ErrorAction SilentlyContinue)){$homes.Add($d.FullName)}
    }
  }
  $javacCommand = Get-Command javac.exe -ErrorAction SilentlyContinue
  if($javacCommand){$homes.Add((Split-Path -Parent (Split-Path -Parent $javacCommand.Source)))}
  foreach($home in @($homes | Select-Object -Unique)){
    $javac = Join-Path $home 'bin\javac.exe'
    if(-not (Test-Path -LiteralPath $javac)){continue}
    $v = ((& $javac -version 2>&1)|Out-String).Trim()
    if($LASTEXITCODE -ne 0 -or $v -notmatch '^javac\s+(17|21)(\.|$)'){continue}
    foreach($tool in @('java.exe','keytool.exe','jarsigner.exe')){
      if(-not (Test-Path -LiteralPath (Join-Path $home ('bin\'+$tool)))){throw ('JDK missing: '+$tool)}
    }
    return $home
  }
  throw 'JDK 21 or 17 not found. Install Temurin JDK 21, then rerun. Do not create a new signing key.'
}
try {
  if(-not $Keystore){$Keystore = Read-Host 'Path to the ORIGINAL existing RivoScan signing keystore (.jks/.p12)'}
  if(-not $Keystore){throw 'An original signing keystore is required. No APK can safely replace Production without it.'}
  $Keystore = (Resolve-Path -LiteralPath $Keystore -ErrorAction Stop).Path
  if(-not (Test-Path -LiteralPath $Keystore -PathType Leaf)){throw 'Keystore path must be a file.'}
  if(-not $Alias){$Alias = Read-Host 'Alias of the EXISTING RivoScan signing key'}
  if($Alias -notmatch '^[a-zA-Z0-9._-]+$'){throw 'Invalid signing alias.'}
  $jdk = Resolve-Jdk
  $env:JAVA_HOME = $jdk
  $env:Path = (Join-Path $jdk 'bin') + ';' + $env:Path
  $keytool = Join-Path $jdk 'bin\keytool.exe'
  $jarsigner = Join-Path $jdk 'bin\jarsigner.exe'
  Write-Host ('Using compatible JDK: '+$jdk) -ForegroundColor Cyan
  $storePassword = Read-Secret 'Existing keystore password (hidden)'
  if(-not $storePassword){throw 'Keystore password is empty.'}
  $same = Read-Host 'Is the key password the same as keystore password? [Y/n]'
  if([string]::IsNullOrWhiteSpace($same) -or $same -match '^[yY]'){
    $keyPassword = $storePassword
  }else{
    $keyPassword = Read-Secret 'Existing key password (hidden)'
  }
  if(-not $keyPassword){throw 'Key password is empty.'}
  $env:RIVOSCAN_RELEASE_STOREPASS = $storePassword
  $env:RIVOSCAN_RELEASE_KEYPASS = $keyPassword
  # Verify the original key before modifying/generated signing artifacts.
  & $keytool -list -keystore $Keystore -alias $Alias -storepass:env RIVOSCAN_RELEASE_STOREPASS | Out-Null
  Assert-Success 'Check original keystore and alias'
  Write-Host 'Verified the selected existing keystore and alias.' -ForegroundColor Green
  $prepare = Join-Path $root 'prepare-rivoscan-production-android-studio.ps1'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $prepare
  Assert-Success 'Prepare latest RivoScan Production with real AdMob assets'
  $versionProps = [IO.File]::ReadAllText((Join-Path $root 'rivoscan-version.properties'))
  $codeMatch = [regex]::Match($versionProps,'(?m)^versionCode=(\d+)\s*$')
  $nameMatch = [regex]::Match($versionProps,'(?m)^versionName=([0-9]+(?:\.[0-9]+){2})\s*$')
  if(-not $codeMatch.Success -or -not $nameMatch.Success){throw 'Production source version unavailable.'}
  $code = [long]$codeMatch.Groups[1].Value
  $name = $nameMatch.Groups[1].Value
  if($code -lt 102){throw 'Refusing to build older than Production code 102.'}
  $native = Join-Path $root 'android'
  $gradlew = Join-Path $native 'gradlew.bat'
  if(-not (Test-Path -LiteralPath $gradlew)){throw 'Gradle wrapper not found.'}
  $sdkRoot = if($env:ANDROID_HOME){$env:ANDROID_HOME}else{Join-Path $env:LOCALAPPDATA 'Android\Sdk'}
  if(-not (Test-Path -LiteralPath $sdkRoot)){throw 'Android SDK not found.'}
  $aapt = Get-AndroidTool 'aapt.exe' $sdkRoot
  $zipalign = Get-AndroidTool 'zipalign.exe' $sdkRoot
  $apksigner = Get-AndroidTool 'apksigner.bat' $sdkRoot
  $revision = ((& git.exe -C $root rev-parse HEAD) | Out-String).Trim()
  Assert-Success 'Read source revision'
  Write-Host ('Building genuine RivoScan Release '+$name+' (code '+$code+').') -ForegroundColor Cyan
  Push-Location -LiteralPath $native
  try {
    & $gradlew ':app:bundleRelease' ':app:assembleRelease' '--no-daemon'
    Assert-Success 'Compile signed-candidate Production Release binaries'
  } finally {Pop-Location}
  $postRevision = ((& git.exe -C $root rev-parse HEAD) | Out-String).Trim()
  if($revision -ne $postRevision){throw 'Source changed while compiling; refusing stale output.'}
  $unsignedBundle = Join-Path $native 'app\build\outputs\bundle\release\app-release.aab'
  $unsignedApk = Join-Path $native 'app\build\outputs\apk\release\app-release-unsigned.apk'
  foreach($p in @($unsignedBundle,$unsignedApk)){
    if(-not (Test-Path -LiteralPath $p -PathType Leaf)){throw ('Missing required Release artifact: '+$p)}
  }
  $badging = ((& $aapt dump badging $unsignedApk 2>&1)|Out-String)
  Assert-Success 'Inspect unsigned Release APK metadata'
  if($badging -notmatch "package:\s+name='com\.ribhlab\.rivoscan'\s+versionCode='$code'\s+versionName='$([regex]::Escape($name))'"){
    throw 'APK applicationId/version does not match Production. No installation attempted.'
  }
  if(-not $OutputDirectory){
    $OutputDirectory=Join-Path (Join-Path $env:USERPROFILE 'Downloads') ('RivoScan-Production-'+$code+'-'+(Get-Date -Format yyyyMMdd-HHmmss))
  }
  [IO.Directory]::CreateDirectory($OutputDirectory)|Out-Null
  $output=(Resolve-Path -LiteralPath $OutputDirectory).Path
  $signedAab=Join-Path $output ('RivoScan-Production-'+$name+'-'+$code+'-SIGNED.aab')
  $alignedApk=Join-Path $output 'rivoscan-release-aligned.tmp.apk'
  $signedApk=Join-Path $output ('RivoScan-Production-'+$name+'-'+$code+'-SIGNED.apk')
  Copy-Item -LiteralPath $unsignedBundle -Destination $signedAab -ErrorAction Stop
  & $jarsigner '-keystore' $Keystore '-storepass:env' 'RIVOSCAN_RELEASE_STOREPASS' '-keypass:env' 'RIVOSCAN_RELEASE_KEYPASS' '-sigalg' 'SHA256withRSA' '-digestalg' 'SHA-256' $signedAab $Alias | Out-Null
  Assert-Success 'Sign Production AAB with existing upload key'
  $verification = ((& $jarsigner -verify $signedAab 2>&1)|Out-String)
  Assert-Success 'Verify signed AAB'
  if($verification -notmatch 'jar verified'){throw 'AAB signature could not be confirmed.'}
  & $zipalign -f -v 4 $unsignedApk $alignedApk | Out-Null
  Assert-Success 'Zipalign Production APK'
  & $apksigner sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:RIVOSCAN_RELEASE_STOREPASS --key-pass env:RIVOSCAN_RELEASE_KEYPASS --out $signedApk $alignedApk
  Assert-Success 'Sign Production APK with existing key'
  Remove-Item -LiteralPath $alignedApk -Force -ErrorAction SilentlyContinue
  $newDigest=Get-ApkCertificateDigest $apksigner $signedApk
  Write-Host ''
  Write-Host ('Production Release '+$name+' / code '+$code+' built and signed.') -ForegroundColor Green
  Write-Host ('APK: '+$signedApk) -ForegroundColor Green
  Write-Host ('AAB: '+$signedAab) -ForegroundColor Green
  Write-Host ('Signer SHA-256: '+$newDigest) -ForegroundColor Cyan
  if(-not $InstallIfCompatible){
    Write-Host 'Not installed automatically. To attempt a SAFE Wi-Fi update, rerun with -InstallIfCompatible.' -ForegroundColor Yellow
    Write-Host 'For a Play-installed app, distribute the signed AAB through the Play testing track.' -ForegroundColor Yellow
  }else{
    $adbCandidates=@()
    foreach($sdk in @($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT)){
      if($sdk){$adbCandidates+=(Join-Path $sdk 'platform-tools\adb.exe')}
    }
    if($env:LOCALAPPDATA){$adbCandidates+=(Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')}
    $adb=$adbCandidates|Where-Object{Test-Path -LiteralPath $_ -PathType Leaf}|Select-Object -First 1
    if(-not $adb){throw 'Signed files created, but ADB is unavailable. Use Google Play for Production update.'}
    $devices=@(& $adb devices -l)
    Assert-Success 'ADB devices'
    $online=@($devices|ForEach-Object{if($_ -match '^\s*(\S+)\s+device(?:\s|$)'){$matches[1]}})
    if($DeviceSerial){
      if($online -notcontains $DeviceSerial){throw 'Signed files created, but requested device is not online.'}
      $serial=$DeviceSerial
    }elseif($online.Count -eq 1){$serial=$online[0]}
    else{throw 'Signed files created, but Wi-Fi ADB does not have exactly one authorized phone. Specify -DeviceSerial.'}
    $adbArgs=@()
    if($online.Count -gt 1){$adbArgs=@('-s',$serial)}
    $appPaths=@(& $adb @adbArgs shell pm path $packageId 2>&1)
    $pathText=$appPaths|Out-String
    $baseMatch=[regex]::Match($pathText,'(?m)^package:(/[\S]+/base\.apk)\r?$')
    if(-not $baseMatch.Success){throw 'Signed files created, but installed Production base.apk is unreadable; update through Google Play. No install attempted.'}
    $pkgInfo=((& $adb @adbArgs shell dumpsys package $packageId 2>&1)|Out-String)
    $installedCode=[regex]::Match($pkgInfo,'versionCode=(\d+)')
    if(-not $installedCode.Success){throw 'Cannot read currently installed version. No install attempted.'}
    if([long]$installedCode.Groups[1].Value -ge $code){throw 'Existing Production versionCode is not older than signed APK. No downgrade attempted.'}
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('rivoscan-cert-check-'+[guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($temp)|Out-Null
    try{
      $existingBase=Join-Path $temp 'installed-base.apk'
      & $adb @adbArgs pull $baseMatch.Groups[1].Value $existingBase | Out-Null
      Assert-Success 'Read installed Production APK for certificate comparison'
      $oldDigest=Get-ApkCertificateDigest $apksigner $existingBase
      if($oldDigest -ne $newDigest){
        Write-Host ('Installed Production certificate SHA-256: '+$oldDigest) -ForegroundColor Yellow
        Write-Host ('New signed APK certificate SHA-256: '+$newDigest) -ForegroundColor Yellow
        Write-Host 'CERTIFICATES DIFFER. Direct update is BLOCKED to protect app data. Update with the signed AAB via Google Play Testing.' -ForegroundColor Yellow
      }else{
        $ok=Read-Host ('Certificates match. Update Production on '+$serial+' in place (no uninstall, preserve documents)? [y/N]')
        if($ok -match '^[yY]$'){
          & $adb @adbArgs install -r $signedApk | Out-Host
          Assert-Success 'Install verified Production APK in place'
          $after=((& $adb @adbArgs shell dumpsys package $packageId 2>&1)|Out-String)
          if($after -notmatch ('versionCode='+$code+'\b')){throw 'Installation returned success, but installed version code could not be verified.'}
          Write-Host ('PASS: RivoScan Production updated IN PLACE to '+$name+' / code '+$code+'. Documents were not deliberately deleted.') -ForegroundColor Green
        }else{Write-Host 'Installation skipped; signed APK/AAB are ready.' -ForegroundColor Yellow}
      }
    }finally{Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}
  }
}catch{
  Write-Host ('PRODUCTION BUILD/INSTALL STOPPED SAFELY: '+$_.Exception.Message) -ForegroundColor Red
  exit 1
}finally{
  if($null -eq $oldStorePass){Remove-Item Env:RIVOSCAN_RELEASE_STOREPASS -ErrorAction SilentlyContinue}else{$env:RIVOSCAN_RELEASE_STOREPASS=$oldStorePass}
  if($null -eq $oldKeyPass){Remove-Item Env:RIVOSCAN_RELEASE_KEYPASS -ErrorAction SilentlyContinue}else{$env:RIVOSCAN_RELEASE_KEYPASS=$oldKeyPass}
  $env:JAVA_HOME=$oldJavaHome
  $env:Path=$oldPath
  $storePassword=$null
  $keyPassword=$null
}
