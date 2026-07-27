@echo off
title Tarmal IT Portal
cd /d "%~dp0"
echo.
echo  Tarmal IT Portal - starting...
echo.

if exist "%~dp0TarmalITPortal.exe" (
  "%~dp0TarmalITPortal.exe"
  goto :end
)

where node >nul 2>&1
if %errorlevel%==0 (
  if exist "%~dp0launcher\server.js" (
    node "%~dp0launcher\server.js"
    goto :end
  )
)

echo  Using PowerShell server fallback...
powershell -ExecutionPolicy Bypass -File "%~dp0start-network-server.ps1"

:end
pause
