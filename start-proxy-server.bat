@echo off
echo Starting bar-buddy Proxy Server...

:: Create a timestamp for log files using PowerShell
for /f "usebackq delims=" %%a in (`powershell -command "Get-Date -Format 'yyyy-MM-dd_HH-mm'"`) do set logdate=%%a

:: Create proxy log directory if it doesn't exist
if not exist C:\GitHub\bar-buddy\logs\proxy mkdir C:\GitHub\bar-buddy\logs\proxy

:: Set log file paths
set LOGFILE=C:\GitHub\bar-buddy\logs\proxy\proxy_%logdate%.log

echo Starting bar-buddy proxy server with logs at %LOGFILE%
echo ===== bar-buddy Proxy Server Started at %date% %time% ===== > %LOGFILE%

:: Change to the project directory
cd C:\GitHub\bar-buddy

:: Run the proxy server and redirect output to log file
"C:\Program Files\nodejs\node.exe" modules/api-proxy/services/proxyServer.js >> %LOGFILE% 2>&1
