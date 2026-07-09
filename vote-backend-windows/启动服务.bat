@echo off
title Vote System Launcher
color 0A

REM Root is one level up from this script
set "ROOT=%~dp0..\"

echo ==========================================
echo   Vote Review System - One-Click Start
echo ==========================================
echo.

echo [1/5] Checking environment...

set JAVA=
if exist "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe" set "JAVA=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe"
if "%JAVA%"=="" where java >nul 2>&1 && set JAVA=java
if "%JAVA%"=="" (
    echo [X] Java 17 not found
    pause
    exit /b
)
echo [OK] Java

where node >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js not found
    pause
    exit /b
)
echo [OK] Node.js

set "JAR=%~dp0vote-system-windows.jar"
if not exist "%JAR%" set "JAR=%ROOT%vote-system-windows.jar"
if not exist "%JAR%" set "JAR=%ROOT%vote-backend-windows\vote-system-windows.jar"
if not exist "%JAR%" (
    echo [X] vote-system-windows.jar not found
    pause
    exit /b
)
if not exist "%ROOT%server.js" (
    echo [X] server.js not found
    pause
    exit /b
)
echo [OK] Files OK

echo.
echo [2/5] Cleaning old services...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| find ":7003" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] Cleaned

echo.
echo [3/5] Starting services...
echo   - Backend (port 7003) ...
start "VoteBackend" "%JAVA%" -jar "%JAR%" --server.port=7003
timeout /t 8 /nobreak >nul
echo   [OK]
echo   - Frontend (port 3000) ...
start "VoteFrontend" /D "%ROOT%" node server.js
timeout /t 3 /nobreak >nul
echo   [OK]

echo.
echo [4/5] Configuring firewall...
net session >nul 2>&1
if errorlevel 1 (
    echo   [--] Not admin, skip firewall
    goto SKIP_FW
)
netsh advfirewall firewall add rule name="VoteSys-7003" dir=in action=allow protocol=tcp localport=7003 >nul 2>&1
netsh advfirewall firewall add rule name="VoteSys-3000" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
echo   [OK] Ports 3000/7003 opened
:SKIP_FW

echo.
echo [5/5] Opening browser...
start http://localhost:3000

echo.
echo ==========================================
echo   System Started!
echo   Local:   http://localhost:3000
echo   Backend: http://localhost:7003
echo   Do NOT close popped-up windows!
echo ==========================================
pause
