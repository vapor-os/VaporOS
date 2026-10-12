@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed - install it from https://nodejs.org first.
  echo.
  pause
  exit /b 1
)
node sakura-local-server.js
pause
