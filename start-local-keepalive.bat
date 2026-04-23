@echo off
setlocal
cd /d "%~dp0"
echo [FinCognis] Keep-alive local server baslatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\start-local-keepalive.ps1" -Port 4173
