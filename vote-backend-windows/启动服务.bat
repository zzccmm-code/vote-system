@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion
title Vote System Launcher
color 0A

cd /d "%~dp0"
cd ..
set "ROOT=%cd%"

cls
echo.
echo  ==========================================
echo    Vote Review System - One-Click Start
echo  ==========================================
echo.

echo  [1/5] Checking environment...

set JAVA=
if exist "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe" (
    set "JAVA=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe"
)
if "%JAVA%"=="" (
    where java 2>nul >nul
    if not errorlevel 1 set JAVA=java
)
if "%JAVA%"=="" (
    echo  [X] Java 17 not found
    pause
    exit /b
)
echo  [OK] Java

where node 2>nul >nul
if errorlevel 1 (
    echo  [X] Node.js not found
    pause
    exit /b
)
echo  [OK] Node.js

if not exist "%ROOT%\vote-system-windows.jar" (
    echo  [X] vote-system-windows.jar not found
    pause
    exit /b
)
if not exist "%ROOT%\server.js" (
    echo  [X] server.js not found
    pause
    exit /b
)
echo  [OK] Files OK

echo.
echo  [2/5] Cleaning old services...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| find ":7003" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul >nul
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul >nul
timeout /t 2 /nobreak >nul
echo  [OK] Cleaned

echo.
echo  [3/5] Starting services...
echo    - Backend (port 7003) ...
start "VoteBackend" "%JAVA%" -jar "%ROOT%\vote-system-windows.jar" --server.port=7003
timeout /t 8 /nobreak >nul
echo    [OK]

echo    - Frontend (port 3000) ...
start "VoteFrontend" /D "%ROOT%" node server.js
timeout /t 3 /nobreak >nul
echo    [OK]

echo.
echo  [4/5] Configuring firewall...
net session 2>nul >nul
if errorlevel 1 (
    echo  [--] Not admin, skip firewall
    goto :SKIP_FW
)
netsh advfirewall firewall add rule name="VoteSys-7003" dir=in action=allow protocol=tcp localport=7003 2>nul >nul
netsh advfirewall firewall add rule name="VoteSys-3000" dir=in action=allow protocol=tcp localport=3000 2>nul >nul
echo  [OK] Ports 3000/7003 opened
:SKIP_FW

echo.
echo  [5/5] Opening browser...

set IP=localhost
for /f "tokens=2 delims=: " %%a in ('ipconfig ^| findstr /i "IPv4 192.168"') do (
    set T=%%a
    set T=!T: =!
    if not "!T!"=="" if not "!T!"=="127.0.0.1" set IP=!T!
)

start http://localhost:3000

echo.
echo  ==========================================
echo    System Started!
echo.
echo    Local:    http://localhost:3000
echo    Tablet:   http://!IP!:3000
echo    Backend:  http://localhost:7003
echo.
echo    Do NOT close the popped-up windows!
echo  ==========================================
pause
