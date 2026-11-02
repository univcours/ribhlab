@echo off
title Disable RivoScan auto-sync at Windows sign-in
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$file=Join-Path ([Environment]::GetFolderPath('Startup')) 'RivoScan AutoSync.lnk'; if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }; Write-Host 'RivoScan automatic startup disabled. Close the watcher window to stop current syncing.'"
pause
