@echo off
title Install RivoScan Live Scanner (Android)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-live-scanner.ps1"
if errorlevel 1 echo Integration failed; check error details above.
pause
