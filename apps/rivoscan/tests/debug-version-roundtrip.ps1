# CI regression: run real device-version guard against mDNS Wireless ADB device
# whose serial contains spaces (a common Samsung Wireless Debugging case).
# No real phone, install/uninstall, or changes to tracked metadata.
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mockDir=Join-Path ([IO.Path]::GetTempPath()) ('rivoscan-adb-mock-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $mockDir -Force | Out-Null
$mock=Join-Path $mockDir 'adb.exe'
$bash=@'
#!/usr/bin/env bash
case "$1" in
  start-server) exit 0 ;;
  devices) printf 'List of devices attached\nadb-RIVO_TEST (2)._adb-tls-connect._tcp\tdevice product:mock\n'; exit 0 ;;
  -s)
    if [[ "$2" == "adb-RIVO_TEST (2)._adb-tls-connect._tcp" && "$3" == "shell" && "$4" == "pm" && "$5" == "path" ]]; then
      printf 'package:/data/app/rivoscan/base.apk\n'
      exit 0
    fi
    if [[ "$2" == "adb-RIVO_TEST (2)._adb-tls-connect._tcp" && "$3" == "shell" && "$4" == "dumpsys" && "$5" == "package" ]]; then
      printf 'Package [com.ribhlab.rivoscan.debug]\n  versionCode=145 minSdk=26 targetSdk=36\n'
      exit 0
    fi
    ;;
esac
echo 'Unexpected fake adb call' >&2
exit 1
'@
[IO.File]::WriteAllText($mock,$bash,[Text.UTF8Encoding]::new($false))
& chmod +x $mock
if($LASTEXITCODE -ne 0){throw 'Mock adb permissions failed'}
$previousPath=$env:PATH
$previousSerial=$env:RIVOSCAN_DEVICE_SERIAL
$previousSdk=$env:ANDROID_HOME
$previousSdkRoot=$env:ANDROID_SDK_ROOT
$local=Join-Path $root 'rivoscan-device-version.properties'
try {
  $env:PATH=$mockDir+[IO.Path]::PathSeparator+$previousPath
  $env:RIVOSCAN_DEVICE_SERIAL=''
  $env:ANDROID_HOME=''
  $env:ANDROID_SDK_ROOT=''
  if(Test-Path $local){throw 'Local override unexpectedly exists in clean CI checkout'}
  & (Join-Path $root 'sync-rivoscan-device-version.ps1')
  if($LASTEXITCODE -ne 0){throw 'Phone version preflight failed'}
  $lines=[IO.File]::ReadAllLines($local)
  if($lines.Length -ne 2 -or $lines[1] -ne 'versionCode=146'){
    throw ("Expected exactly versionCode=146 but got: " + ($lines -join ' | '))
  }
  $props=[IO.File]::ReadAllText($local)
  if($props -notmatch '(?m)^versionCode=146\r?$'){
    throw 'Java Properties-compatible local versionCode not written'
  }
  Write-Host 'PASS: real PowerShell preflight preserved spaced mDNS serial and generated valid DEBUG versionCode=146.' -ForegroundColor Green
} finally {
  $env:PATH=$previousPath
  $env:RIVOSCAN_DEVICE_SERIAL=$previousSerial
  $env:ANDROID_HOME=$previousSdk
  $env:ANDROID_SDK_ROOT=$previousSdkRoot
  Remove-Item -LiteralPath $local -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $mockDir -Force -Recurse -ErrorAction SilentlyContinue
}
