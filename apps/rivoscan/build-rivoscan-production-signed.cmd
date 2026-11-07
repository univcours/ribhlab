@echo off
setlocal
title RivoScan Production - Signed Release 102 (safe in-place update)
cd /d "%~dp0" || exit /b 1
echo.
echo RivoScan Production - Build signed APK and Play AAB
 echo Safe install is attempted ONLY when signing certificates match.
echo Original RivoScan and documents are never deliberately uninstalled or cleared.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-rivoscan-production-signed.ps1" -InstallIfCompatible
set code=%ERRORLEVEL%
echo.
if not "%code%"=="0" echo Build stopped. Read the error above; NEVER uninstall your Play app.
pause
exit /b %code%
