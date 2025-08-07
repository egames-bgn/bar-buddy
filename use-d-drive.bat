@echo off
echo Setting up environment to use D drive for temporary files and logs...

:: Set temporary directories to D drive
SET TEMP=D:\Temp
SET TMP=D:\Temp

:: Create directories if they don't exist
if not exist D:\Temp mkdir D:\Temp
if not exist D:\Logs mkdir D:\Logs
if not exist D:\npm-cache mkdir D:\npm-cache

:: Set Node.js environment variables to use D drive
SET NODE_OPTIONS=--max-old-space-size=4096
SET npm_config_cache=D:\npm-cache
SET npm_config_tmp=D:\Temp

:: Set logging environment variables
SET LOG_DIR=D:\Logs
SET DEBUG_LOG_PATH=D:\Logs
SET NODE_DEBUG_OUTPUT=D:\Logs\node_debug.log

:: bar-buddy specific log settings
SET BARBUDDY_LOG_DIR=D:\Logs\bar-buddy

:: Create bar-buddy log directory
if not exist D:\Logs\bar-buddy mkdir D:\Logs\bar-buddy

:: Display current settings
echo Temporary directory set to: %TEMP%
echo Logs directory set to: %LOG_DIR%
echo bar-buddy logs directory: %BARBUDDY_LOG_DIR%
echo Node.js cache directory: %npm_config_cache%
echo Using D drive for all temporary operations and logs

echo.
echo IMPORTANT: These settings are only valid for the current terminal session.
echo To make them permanent, set these environment variables in your system settings.
echo.

:: Optional: Add additional project-specific environment variables here

echo Environment configured successfully!
