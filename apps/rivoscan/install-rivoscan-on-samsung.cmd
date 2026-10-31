@echo off
setlocal
title RivoScan v0.4 - Rebuild and Install on Samsung
cd /d "%~dp0" || exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-rivoscan-on-samsung.ps1"
if errorlevel 1 (
  echo.
  echo Installation stopped. Send a screenshot of this window to diagnose. Your previous app was not uninstalled.
) else (
  echo.
  echo RivoScan installed. Check the blue scanner launcher icon on your Samsung.
)
pause
