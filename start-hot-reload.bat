@echo off
echo Starting bar-buddy with hot reloading...

:: Set environment variables
set NODE_OPTIONS=--max-old-space-size=4096 --max_old_space_size=4096

:: Create timestamp for logs
set datetime=%date:~10,4%%date:~4,2%%date:~7,2%%time:~0,2%%time:~3,2%
set datetime=%datetime: =0%
set logdate=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%
set logdate=%logdate: =0%

:: Set log file
set LOGFILE=c:\GitHub\bar-buddy\logs\app\hot-reload_%logdate%.log

:: Create log directory if it doesn't exist
if not exist c:\GitHub\bar-buddy\logs\app mkdir c:\GitHub\bar-buddy\logs\app

echo Starting bar-buddy hot reloading with logs at %LOGFILE%
echo ===== bar-buddy Hot Reload Started at %date% %time% ===== > %LOGFILE%

:: Run the application with hot reloading
cd C:\GitHub\bar-buddy
echo Running npm run web with hot reloading... >> %LOGFILE%
npm run web >> %LOGFILE% 2>&1
