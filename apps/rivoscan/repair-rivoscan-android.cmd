@echo off
setlocal
title RivoScan - Repair missing Android live scanner
cd /d "%~dp0" || exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0repair-rivoscan-android.ps1"
if errorlevel 1 (
  echo.
  echo Copy the error above or send a screenshot from this window.
) else (
  echo.
  echo Android build completed. Sync Gradle and press Run in Android Studio.
)
pause
