@echo off
setlocal
cd /d "%~dp0"
echo [FinCognis] Local server baslatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\start-local.ps1" -Port 4173
