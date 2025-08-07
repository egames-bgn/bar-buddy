@echo off
echo Starting bar-buddy web application...

:: Create a timestamp for log files using PowerShell
for /f "usebackq delims=" %%a in (`powershell -command "Get-Date -Format 'yyyy-MM-dd_HH-mm'"`) do set logdate=%%a

:: Create app log directory if it doesn't exist
if not exist C:\GitHub\bar-buddy\logs\web mkdir C:\GitHub\bar-buddy\logs\web

:: Set log file paths
set LOGFILE=C:\GitHub\bar-buddy\logs\web\web_%logdate%.log

echo Starting bar-buddy web app with logs at %LOGFILE%
echo ===== bar-buddy Web App Started at %date% %time% ===== > %LOGFILE%

:: Run the web app and redirect output to log file
cd C:\GitHub\bar-buddy
"C:\Program Files\nodejs\npm.cmd" run web >> %LOGFILE% 2>&1
