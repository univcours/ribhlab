# Prepares the latest RivoScan Android project for a manually signed Google Play release.
# This script NEVER signs, installs, uninstalls, clears app data, or uploads to Play.
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$branch='feat/rivoscan-android-beta'
$expectedAppId='ca-app-pub-7945572016731367~1509328607'
$realUnits=@(
  'ca-app-pub-7945572016731367/5608742752', # Interstitial
  'ca-app-pub-7945572016731367/6270875707'  # App Open
)
function Check-Exit([string]$step) {
  if($LASTEXITCODE -ne 0){throw "$step failed (exit $LASTEXITCODE)."}
}
$prevProduction=$env:RIVOSCAN_ADMOB_PRODUCTION
$prevViteProduction=$env:VITE_RIVOSCAN_ADMOB_PRODUCTION
$prevAppId=$env:RIVOSCAN_ADMOB_APP_ID
$prevViteAppId=$env:VITE_RIVOSCAN_ADMOB_APP_ID
try{
  if(-not (Get-Command git.exe -ErrorAction SilentlyContinue)){throw 'Git is missing.'}
  $gitRoot=((& git.exe -C $root rev-parse --show-toplevel) | Out-String).Trim()
  Check-Exit 'Locate Git checkout'
  $dirty=@(& git.exe -C $gitRoot status --porcelain --untracked-files=no)
  Check-Exit 'Check local changes'
  if($dirty.Count -gt 0){throw 'Tracked local changes detected. Commit or stash first; nothing overwritten.'}
  & git.exe -C $gitRoot fetch --no-tags origin "refs/heads/$($branch):refs/remotes/origin/$($branch)" | Out-Host
  Check-Exit 'Fetch latest RivoScan branch'
  $current=((& git.exe -C $gitRoot branch --show-current) | Out-String).Trim()
  Check-Exit 'Read branch'
  if($current -ne $branch){
    & git.exe -C $gitRoot show-ref --verify --quiet "refs/heads/$branch"
    if($LASTEXITCODE -eq 0){
      & git.exe -C $gitRoot switch $branch | Out-Host
    }else{
      & git.exe -C $gitRoot switch --track -c $branch "origin/$branch" | Out-Host
    }
    Check-Exit 'Switch to production source'
  }
  & git.exe -C $gitRoot merge --ff-only "refs/remotes/origin/$branch" | Out-Host
  Check-Exit 'Fast-forward latest source'
  $revision=((& git.exe -C $gitRoot rev-parse HEAD) | Out-String).Trim()
  $remote=((& git.exe -C $gitRoot rev-parse "refs/remotes/origin/$branch") | Out-String).Trim()
  Check-Exit 'Verify revision'
  if($revision -ne $remote){throw 'Checkout is not latest. Aborted.'}
  $versionText=[IO.File]::ReadAllText((Join-Path $root 'rivoscan-version.properties'))
  if($versionText -notmatch '(?m)^versionCode=(\d+)\s*$' -or [long]$matches[1] -lt 101){
    throw 'RivoScan versionCode is older than 101. Refusing a stale production build.'
  }
  $nameMatch=[regex]::Match($versionText,'(?m)^versionName=([0-9]+(?:\.[0-9]+){2})\s*$')
  $name=if($nameMatch.Success){$nameMatch.Groups[1].Value}else{''}
  $package=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json)
  if(-not $name -or $package.version -ne $name){throw 'Inconsistent production version metadata.'}
  if(-not (Get-Command npm.cmd -ErrorAction SilentlyContinue) -or
     -not (Get-Command npx.cmd -ErrorAction SilentlyContinue)){
    throw 'Install Node.js/npm and use a PowerShell terminal with npm on PATH.'
  }

  # Production values apply exclusively to this process, never the debug installer.
  $env:RIVOSCAN_ADMOB_PRODUCTION='true'
  $env:VITE_RIVOSCAN_ADMOB_PRODUCTION='true'
  $env:RIVOSCAN_ADMOB_APP_ID=$expectedAppId
  $env:VITE_RIVOSCAN_ADMOB_APP_ID=$expectedAppId
  Push-Location -LiteralPath $root
  try{
    & npm.cmd install --no-audit --no-fund
    Check-Exit 'Install dependencies'
    & npm.cmd run check
    Check-Exit 'Validate production JS'
    & npm.cmd test
    Check-Exit 'Unit tests'
    & npm.cmd run check:ads
    Check-Exit 'Validate AdMob real IDs'
    & npm.cmd run build
    Check-Exit 'Bundle production web assets'
    $assetsDir=Join-Path $root 'dist\assets'
    $assets=@(Get-ChildItem -LiteralPath $assetsDir -Filter '*.js' -File -ErrorAction Stop)
    if($assets.Count -eq 0){throw 'Production JavaScript bundle is missing.'}
    $bundle=($assets | ForEach-Object {[IO.File]::ReadAllText($_.FullName)}) -join ''
    foreach($unit in $realUnits){
      if(-not $bundle.Contains($unit)){throw "Real AdMob unit missing in production JS: $unit"}
    }
    if($bundle.Contains('ca-app-pub-7945572016731367/4148993879')){
      throw 'An old rewarded-video ad unit is present. Production build blocked.'
    }
    if(-not (Test-Path -LiteralPath (Join-Path $root 'android\settings.gradle'))){
      & npx.cmd cap add android
      Check-Exit 'Create Android wrapper'
    }
    & npx.cmd cap sync android
    Check-Exit 'Sync latest production assets to native Android'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'install-live-scanner.ps1')
    Check-Exit 'Integrate live scanner and Android branding'
    $manifest=Join-Path $root 'android\app\src\main\AndroidManifest.xml'
    $xml=[IO.File]::ReadAllText($manifest)
    if(-not $xml.Contains($expectedAppId)){throw 'RivoScan production App ID missing from Android manifest.'}
    # Do not finalize a stale bundle if another source update arrived mid-build.
    & git.exe -C $gitRoot fetch --no-tags origin "refs/heads/$($branch):refs/remotes/origin/$($branch)" | Out-Host
    Check-Exit 'Check latest source after sync'
    $latest=((& git.exe -C $gitRoot rev-parse "refs/remotes/origin/$branch") | Out-String).Trim()
    Check-Exit 'Verify latest source after sync'
    if($latest -ne $revision){throw 'Newer source published during build. Re-run before signing.'}
    Write-Host ''
    Write-Host "READY FOR ANDROID STUDIO: RivoScan v$name / $($revision.Substring(0,12))" -ForegroundColor Green
    Write-Host "Open: $(Join-Path $root 'android')" -ForegroundColor Cyan
    $modeFile=Join-Path $root 'android\app\src\main\assets\public\rivoscan-build-mode.txt'
    if(-not (Test-Path -LiteralPath $modeFile) -or
       ([IO.File]::ReadAllText($modeFile).Trim()) -ne 'production'){
      throw 'Android assets are not marked production: refusing a mixed release.'
    }
    Write-Host 'Android Studio > Build > Generate Signed Bundle / APK > Android App Bundle (Release).' -ForegroundColor Green
    Write-Host 'IMPORTANT: Android Studio Run installs a separate RivoScan DEV, NOT Production.' -ForegroundColor Yellow
    Write-Host 'Release AAB will include native SYMBOL_TABLE diagnostics when available.' -ForegroundColor Cyan
    Write-Host 'If R8 minification is disabled, no Java mapping.txt exists; that warning is informational.' -ForegroundColor Yellow
    Write-Host 'Never upload diagnostic files from this version to a different Play versionCode such as 74.' -ForegroundColor Yellow
    Write-Host 'Sign manually with YOUR existing Play upload keystore. This script has NOT signed or uploaded anything.' -ForegroundColor Yellow
    Write-Host 'WARNING: Do not run the DEBUG installer after this preparation and before signing; it rebuilds test-ad assets.' -ForegroundColor Yellow
  }finally{
    Pop-Location
  }
}catch{
  Write-Host ("PRODUCTION PREPARATION STOPPED: "+$_.Exception.Message) -ForegroundColor Red
  exit 1
}finally{
  $env:RIVOSCAN_ADMOB_PRODUCTION=$prevProduction
  $env:VITE_RIVOSCAN_ADMOB_PRODUCTION=$prevViteProduction
  $env:RIVOSCAN_ADMOB_APP_ID=$prevAppId
  $env:VITE_RIVOSCAN_ADMOB_APP_ID=$prevViteAppId
}
