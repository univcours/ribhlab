@echo off
title Fix RivoScan Android Gradle (AGP 9+)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-gradle-rivoscan.ps1"
if errorlevel 1 (
  echo.
  echo Could not apply the fix automatically. See the message above.
) else (
  echo.
  echo Return to Android Studio and click Sync Now, then Run.
)
pause
