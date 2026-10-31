@echo off
title Enable RivoScan auto-sync at Windows sign-in
set "RIVO_AUTOSYNC_LAUNCHER=%~dp0start-rivoscan-autosync.cmd"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$startup=[Environment]::GetFolderPath('Startup'); $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut((Join-Path $startup 'RivoScan AutoSync.lnk')); $link.TargetPath=$env:RIVO_AUTOSYNC_LAUNCHER; $link.WorkingDirectory=Split-Path -Parent $env:RIVO_AUTOSYNC_LAUNCHER; $link.Save(); Write-Host 'RivoScan auto-sync will start when you sign in to Windows.'"
if errorlevel 1 (
  echo Could not set startup. Try again or run the regular launcher.
) else (
  echo Setup complete. You can also run start-rivoscan-autosync.cmd now.
)
pause
