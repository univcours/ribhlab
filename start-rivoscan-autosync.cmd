@echo off
title RivoScan - Automatic GitHub Sync
set "SCRIPT=%~dp0auto-sync-rivoscan.ps1"
if not exist "%SCRIPT%" (
  echo Missing file: %SCRIPT%
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -IntervalSeconds 90
if errorlevel 1 (
  echo.
  echo Sync stopped with an error. See details above.
  pause
)
