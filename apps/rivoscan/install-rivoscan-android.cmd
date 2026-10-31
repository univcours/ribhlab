@echo off
setlocal
title RivoScan Android - Build and install on any supported phone
cd /d "%~dp0" || exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-rivoscan-on-samsung.ps1"
if errorlevel 1 (
  echo.
  echo Install stopped. Your app was not uninstalled and its data was not cleared.
  echo Check the error above or send a screenshot to troubleshoot.
) else (
  echo.
  echo RivoScan was installed on the selected Android device.
)
pause
