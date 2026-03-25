@echo off
:: Right-click this file -> Run as administrator
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0add-ufc-hosts-entry.ps1"
echo.
pause
