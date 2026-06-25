@echo off
title Vote Backend Service

echo ============================================
echo    Review Voting System - Backend Service
echo ============================================
echo.

set JAVA=
set JDK_PATH=%USERPROFILE%\Downloads\microsoft-jdk-17.0.11-windows-x64\jdk-17.0.11+9\bin\java.exe

if exist "%JDK_PATH%" (
    set JAVA=%JDK_PATH%
) else (
    where java >nul 2>&1
    if not errorlevel 1 set JAVA=java
)

if "%JAVA%"=="" (
    echo [Error] Java not found!
    echo.
    echo Please install JDK 17 or above:
    echo   https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip
    echo.
    pause
    exit /b 1
)

echo [OK] Java found.
echo.

cd /d "%~dp0"

if not exist "vote-system-windows.jar" (
    echo [Error] vote-system-windows.jar not found!
    pause
    exit /b 1
)

echo Starting backend service...
echo.
echo   Service URL:  http://localhost:7003
echo   H2 Console:   http://localhost:7003/h2-console
echo   Press Ctrl+C to stop
echo ============================================
echo.

"%JAVA%" -jar vote-system-windows.jar --server.port=7003

echo.
echo Service stopped.
pause
