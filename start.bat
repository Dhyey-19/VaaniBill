@echo off
setlocal
cd /d %~dp0
set LOGFILE=startup.log
echo Starting VaaniBill...
echo Starting VaaniBill... > %LOGFILE%
if not exist node_modules (
  echo Downloading dependencies...
  echo Downloading dependencies... >> %LOGFILE%
  if exist package-lock.json (
    call npm ci >> %LOGFILE% 2>&1
  ) else (
    call npm install >> %LOGFILE% 2>&1
  )
  if errorlevel 1 goto :error
)
echo Building app...
echo Building app... >> %LOGFILE%
call npm run build >> %LOGFILE% 2>&1
if errorlevel 1 goto :error
echo Build completed.
echo Build completed. >> %LOGFILE%
echo Starting server...
echo Starting server... >> %LOGFILE%
start "" http://localhost:5174
call node server/index.js >> %LOGFILE% 2>&1
echo. >> %LOGFILE%
echo Server stopped. Press any key to close.
pause >nul
goto :eof

:error
echo.
echo An error occurred. Check %LOGFILE% for details.
type %LOGFILE%
pause >nul
