# RivoScan official scanner logo -> native Android launcher icon
# Run after 'npx cap sync android'. Safe to run repeatedly.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$source = Join-Path $root 'assets\icon.png.b64'
$manifest = Join-Path $root 'android\app\src\main\AndroidManifest.xml'
$resources = Join-Path $root 'android\app\src\main\res\drawable-nodpi'
if(-not (Test-Path -LiteralPath $source)){ throw 'Missing scanner icon asset: assets/icon.png.b64' }
if(-not (Test-Path -LiteralPath $manifest)){ throw 'Android wrapper is missing. Run npm run build and npx cap sync android first.' }
$encoded = [System.IO.File]::ReadAllText($source).Trim()
$bytes = [Convert]::FromBase64String($encoded)
if($bytes.Length -lt 8 -or [Convert]::ToHexString($bytes[0..7]) -ne '89504E470D0A1A0A'){
  throw 'The branding asset is not a valid PNG signature.'
}
[System.IO.Directory]::CreateDirectory($resources) | Out-Null
$iconFile = Join-Path $resources 'rivoscan_icon.png'
[System.IO.File]::WriteAllBytes($iconFile,$bytes)
$xml = [System.IO.File]::ReadAllText($manifest)
$xml = $xml.Replace('@mipmap/ic_launcher_round','@drawable/rivoscan_icon')
$xml = $xml.Replace('@mipmap/ic_launcher','@drawable/rivoscan_icon')
[System.IO.File]::WriteAllText($manifest,$xml,[System.Text.UTF8Encoding]::new($false))
Write-Host 'RivoScan scanner logo applied to Android launcher.' -ForegroundColor Green
