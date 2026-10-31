# RivoScan GitHub -> Android Studio auto sync
# Start with start-rivoscan-autosync.cmd. Close that window to stop.
param(
  [ValidateRange(30, 3600)]
  [int]$IntervalSeconds = 90
)

$ErrorActionPreference = 'Stop'
$branchName = 'feat/rivoscan-android-beta'
$appDir = $PSScriptRoot
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $appDir '..\..')).Path

function Say([string]$message, [string]$color = 'Gray') {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $message) -ForegroundColor $color
}

function Check-Exit([string]$step) {
  if ($LASTEXITCODE -ne 0) {
    throw "$step failed (exit code $LASTEXITCODE)."
  }
}

function Sync-Once {
  $currentBranch = (& git -C $repoRoot branch --show-current)
  Check-Exit 'Reading Git branch'
  if ($currentBranch.Trim() -ne $branchName) {
    Say "Paused: switch the repository to $branchName in Android Studio first. Currently on '$currentBranch'." 'Yellow'
    return
  }

  # FETCH does not modify local files. Check for a fast-forward before touching anything.
  & git -C $repoRoot fetch --quiet origin $branchName
  Check-Exit 'Git fetch'
  $localSha = (& git -C $repoRoot rev-parse HEAD).Trim()
  Check-Exit 'Reading local commit'
  $remoteSha = (& git -C $repoRoot rev-parse FETCH_HEAD).Trim()
  Check-Exit 'Reading remote commit'
  if ($localSha -eq $remoteSha) { return }

  & git -C $repoRoot merge-base --is-ancestor $localSha $remoteSha
  if ($LASTEXITCODE -ne 0) {
    Say 'Paused: local and remote branches have diverged. No changes applied. Resolve via Android Studio Git.' 'Yellow'
    return
  }

  # Do not overwrite tracked local edits; never reset, stash, or force pull automatically.
  $localEdits = @(& git -C $repoRoot status --porcelain --untracked-files=no)
  Check-Exit 'Checking local changes'
  if ($localEdits.Count -gt 0) {
    Say 'Paused: uncommitted local changes exist. Commit or stash them in Android Studio before auto-sync can apply updates.' 'Yellow'
    return
  }

  Say ('New GitHub commit detected: ' + $remoteSha.Substring(0, 8)) 'Cyan'
  & git -C $repoRoot merge --ff-only $remoteSha
  Check-Exit 'Git fast-forward'
  Say 'GitHub code updated successfully on this PC.' 'Green'

  $changed = @(& git -C $repoRoot diff --name-only $localSha $remoteSha -- 'apps/rivoscan/')
  Check-Exit 'Checking updated files'
  $hasWebChanges = @($changed | Where-Object { $_ -match '^apps/rivoscan/(src/|public/|assets/|index\.html$|package(-lock)?\.json$|capacitor\.config|vite\.config)' }).Count -gt 0
  if (-not $hasWebChanges) {
    Say 'No web/mobile bundle changes in this update; Android rebuild not needed.' 'DarkGray'
    return
  }

  $nativeProject = Join-Path $appDir 'android\settings.gradle'
  if (-not (Test-Path -LiteralPath $nativeProject)) {
    Say 'Android folder not found. Run setup-android-studio.cmd once to generate it. GitHub source is already updated.' 'Yellow'
    return
  }

  Push-Location -LiteralPath $appDir
  try {
    $dependencyChanges = @($changed | Where-Object { $_ -match '^apps/rivoscan/package(-lock)?\.json$' }).Count -gt 0
    if ($dependencyChanges -or -not (Test-Path -LiteralPath (Join-Path $appDir 'node_modules'))) {
      Say 'Installing updated npm dependencies...' 'Cyan'
      & npm.cmd install --no-audit --no-fund
      Check-Exit 'npm install'
    }
    Say 'Building updated RivoScan web assets...' 'Cyan'
    & npm.cmd run build
    Check-Exit 'npm run build'
    Say 'Copying updates into the Android project (Capacitor)...' 'Cyan'
    & npx.cmd cap sync android
    Check-Exit 'Capacitor sync'
    Say 'Done. Android Studio should detect the updated files. Press Run to install the new version on your phone.' 'Green'
  }
  finally {
    Pop-Location
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: Git for Windows is required.' -ForegroundColor Red
  exit 1
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: Node.js / npm is required.' -ForegroundColor Red
  exit 1
}

$mutex = New-Object System.Threading.Mutex($false, 'Local\RivoScanAutoSync')
$gotLock = $mutex.WaitOne(0)
if (-not $gotLock) {
  Say 'RivoScan auto-sync is already running. No second instance started.' 'Yellow'
  $mutex.Dispose()
  exit 0
}

try {
  Say 'RivoScan auto-sync started.' 'Green'
  Say ("Checking GitHub every {0} seconds. Keep this window open; Ctrl+C stops it." -f $IntervalSeconds)
  Say ('Branch: ' + $branchName)
  while ($true) {
    try { Sync-Once }
    catch { Say ('Sync failed safely: ' + $_.Exception.Message) 'Red' }
    Start-Sleep -Seconds $IntervalSeconds
  }
}
finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
