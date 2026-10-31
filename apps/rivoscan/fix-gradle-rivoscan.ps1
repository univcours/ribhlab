# Repair RivoScan's generated Android Gradle configuration (AGP 9+).
# Idempotent: only replaces the legacy default ProGuard file reference.
$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'android\app\build.gradle'
if (-not (Test-Path -LiteralPath $path)) {
  Write-Host 'Android Gradle file not found. Run setup-android-studio.cmd first.' -ForegroundColor Yellow
  exit 1
}

$old = "getDefaultProguardFile('proguard-android.txt')"
$new = "getDefaultProguardFile('proguard-android-optimize.txt')"
$content = [System.IO.File]::ReadAllText($path)
if ($content.Contains($old)) {
  $updated = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($path, $updated, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'RivoScan Gradle fixed: replaced deprecated proguard-android.txt with proguard-android-optimize.txt.' -ForegroundColor Green
  Write-Host 'In Android Studio, click Sync Now and run the app again.'
  exit 0
}
if ($content.Contains($new)) {
  Write-Host 'RivoScan Gradle already uses the supported optimized ProGuard rules.' -ForegroundColor Green
  exit 0
}
Write-Host 'Expected ProGuard configuration not found. No changes made.' -ForegroundColor Yellow
exit 2
