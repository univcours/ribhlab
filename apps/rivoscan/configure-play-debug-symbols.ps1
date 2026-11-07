# RivoScan release native symbols for Google Play Android Vitals.
# Idempotent. Does not change R8 minification, app version, signing or install.
$ErrorActionPreference = 'Stop'
$root=$PSScriptRoot
$gradle=Join-Path $root 'android\app\build.gradle'
if(-not (Test-Path -LiteralPath $gradle -PathType Leaf)){
  throw 'Android wrapper missing: run npx cap sync android first.'
}
$content=[IO.File]::ReadAllText($gradle)
if($content -notmatch '\bbuildTypes\s*\{'){throw 'Android buildTypes missing.'}
$release=[regex]::Matches($content,'(?m)^(?<indent>[ \t]*)release[ \t]*\{[ \t]*\r?$')
if($release.Count -ne 1){
  throw "Exactly one Android release block expected, got $($release.Count)."
}
if($content.Contains("debugSymbolLevel 'SYMBOL_TABLE'") -or
   $content.Contains("debugSymbolLevel 'FULL'") -or
   $content.Contains('debugSymbolLevel = ')){
  Write-Host 'Native release symbols already configured.' -ForegroundColor Green
}else{
  $match=$release[0]
  $indent=$match.Groups['indent'].Value
  $pieces=@(
    ($indent+'    // Google Play native symbols for release crashes.'),
    ($indent+'    ndk {'),
    ($indent+"        debugSymbolLevel 'SYMBOL_TABLE'"),
    ($indent+'    }')
  )
  $content=$content.Insert($match.Index+$match.Length, [Environment]::NewLine+($pieces -join [Environment]::NewLine))
  [IO.File]::WriteAllText($gradle,$content,[Text.UTF8Encoding]::new($false))
  Write-Host 'Native release diagnostics SYMBOL_TABLE configured.' -ForegroundColor Green
}
if($content -match '(?m)^\s*minifyEnabled\s+true\b'){
  Write-Host 'R8 enabled: inspect mapping/release/mapping.txt after bundleRelease.' -ForegroundColor Cyan
}else{
  Write-Host 'R8 disabled: no mapping.txt is expected, and that Play warning is informational.' -ForegroundColor Yellow
}
Write-Host 'Attach symbols ONLY to their exact versionCode; never to another release.' -ForegroundColor Cyan
