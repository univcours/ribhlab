# Backwards-compatible alias. The installer now supports all connected Android brands.
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install-rivoscan-android.ps1')
exit $LASTEXITCODE
