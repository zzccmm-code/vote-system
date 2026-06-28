@echo off
setlocal enabledelayedexpansion
title 科技奖评审表决系统 - 一键启动
color 0A
chcp 65001 >nul

REM 先切换到脚本所在目录
cd /d "%~dp0"
cd ..
set "ROOT=%cd%"

cls
echo.
echo  ==========================================
echo    国网四川省电力公司科技奖励评审系统
echo    一键启动
echo  ==========================================
echo.

REM ==== 第1步: 环境检测 ====
echo  [1/5] 检测运行环境...

set JAVA=
if exist "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe" (
    set "JAVA=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe"
)
if "%JAVA%"=="" (
    where java 2>nul >nul
    if not errorlevel 1 set JAVA=java
)
if "%JAVA%"=="" (
    echo  [X] 未找到 Java 17
    pause
    exit /b
)
echo  [OK] Java

where node 2>nul >nul
if errorlevel 1 (
    echo  [X] 未找到 Node.js
    pause
    exit /b
)
echo  [OK] Node.js

if not exist "%ROOT%\vote-system-windows.jar" (
    echo  [X] 未找到 vote-system-windows.jar
    echo     请先运行 vote-backend-windows\重新构建.bat
    pause
    exit /b
)
if not exist "%ROOT%\server.js" (
    echo  [X] 未找到 server.js
    pause
    exit /b
)
echo  [OK] 项目文件完整

REM ==== 第2步: 清理 ====
echo.
echo  [2/5] 清理旧服务...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| find ":7003" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul >nul
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul >nul
timeout /t 2 /nobreak >nul
echo  [OK] 已清理

REM ==== 第3步: 启动 ====
echo.
echo  [3/5] 启动系统...
echo    - 后端 (7003) ...
start "VoteBackend" "%JAVA%" -jar "%ROOT%\vote-system-windows.jar" --server.port=7003
timeout /t 8 /nobreak >nul
echo    [OK]

echo    - 前端 (3000) ...
start "VoteFrontend" /D "%ROOT%" node server.js
timeout /t 3 /nobreak >nul
echo    [OK]

REM ==== 第4步: 防火墙 ====
echo.
echo  [4/5] 配置防火墙...
net session 2>nul >nul
if errorlevel 1 (
    echo  [--] 非管理员，跳过防火墙
    goto :SKIP_FW
)
netsh advfirewall firewall add rule name="VoteSys-7003" dir=in action=allow protocol=tcp localport=7003 2>nul >nul
netsh advfirewall firewall add rule name="VoteSys-3000" dir=in action=allow protocol=tcp localport=3000 2>nul >nul
echo  [OK] 端口 3000/7003 已放行
:SKIP_FW

REM ==== 第5步: 获取IP ====
echo.
echo  [5/5] 启动完成

set IP=localhost
for /f "tokens=2 delims=: " %%a in ('ipconfig ^| findstr /i "IPv4 192.168"') do (
    set T=%%a
    set T=!T: =!
    if not "!T!"=="" if not "!T!"=="127.0.0.1" set IP=!T!
)

start http://localhost:3000

echo.
echo  ==========================================
echo    系统启动完成
echo.
echo    本机管理:  http://localhost:3000
echo    平板访问:  http://!IP!:3000
echo    后端 API:  http://localhost:7003
echo.
echo    请勿关闭弹出的命令行窗口
echo  ==========================================
pause
