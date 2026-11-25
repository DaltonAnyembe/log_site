@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Optional first argument: the port to use (defaults to 8000).
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"
set "URL=http://localhost:%PORT%/"

rem If a server is already running on this port, just open the browser.
curl -s -o nul --max-time 1 "%URL%" >nul 2>nul
if not errorlevel 1 (
  echo Already serving this folder at %URL%
  start "" "%URL%"
  exit /b 0
)

set "PY="
where python >nul 2>nul
if not errorlevel 1 set "PY=python"
if not defined PY (
  where py >nul 2>nul
  if not errorlevel 1 set "PY=py"
)
if not defined PY (
  echo Python 3 is required to serve this site: https://www.python.org/downloads/
  echo Install it, then run this file again.
  pause
  exit /b 1
)

echo Serving this folder at %URL%
echo The JSON content only loads over HTTP, so keep this window open.
echo Press Ctrl+C to stop the server.
start "" "%URL%"
"%PY%" -m http.server "%PORT%" --bind 127.0.0.1
