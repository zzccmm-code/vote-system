@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title 科技奖评审表决系统 - 一键启动
color 0A

cd /d "%~dp0"
cd ..
set "ROOT=%cd%"
cd /d "%~dp0"

echo.
echo  ==========================================
echo    国网四川省电力公司科技奖励评审系统
echo    一键启动
echo  ==========================================
echo.

REM ============================================================
REM  第1步：环境检测
REM ============================================================
echo  [1/5] 检测运行环境...

REM --- 找 Java ---
set JAVA=
if exist "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe" set JAVA=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe
if "%JAVA%"=="" if exist "%USERPROFILE%\Downloads\microsoft-jdk-17.0.11-windows-x64\jdk-17.0.11+9\bin\java.exe" set JAVA=%USERPROFILE%\Downloads\microsoft-jdk-17.0.11-windows-x64\jdk-17.0.11+9\bin\java.exe
if "%JAVA%"=="" (
    where java >nul 2>&1
    if not errorlevel 1 set JAVA=java
)
if "%JAVA%"=="" (
    echo  [X] 未找到 Java 17！
    echo     请下载: https://learn.microsoft.com/zh-cn/java/openjdk/download
    pause
    exit /b 1
)
echo  [OK] Java 已就绪

REM --- 找 Node.js ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] 未找到 Node.js！
    echo     请下载: https://nodejs.org/
    pause
    exit /b 1
)
echo  [OK] Node.js 已就绪

REM --- 检查文件 ---
if not exist "%ROOT%\vote-system-windows.jar" (
    echo  [X] 未找到 vote-system-windows.jar！
    echo     请先运行 vote-backend-windows\重新构建.bat
    pause
    exit /b 1
)
if not exist "%ROOT%\server.js" (
    echo  [X] 未找到 server.js！
    pause
    exit /b 1
)
echo  [OK] 项目文件完整

REM ============================================================
REM  第2步：清理旧服务
REM ============================================================
echo.
echo  [2/5] 清理旧服务...

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7003" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo  [OK] 旧服务已清理

REM ============================================================
REM  第3步：启动系统
REM ============================================================
echo.
echo  [3/5] 启动系统...

echo   启动后端 (端口 7003) ...
start "VoteBackend" "%JAVA%" -jar "%ROOT%\vote-system-windows.jar" --server.port=7003

echo   等待后端就绪 (约15秒) ...
timeout /t 8 /nobreak >nul
echo  [OK] 后端已启动

echo   启动前端 (端口 3000) ...
start "VoteFrontend" /D "%ROOT%" node server.js
timeout /t 3 /nobreak >nul
echo  [OK] 前端已启动

REM ============================================================
REM  第4步：配置防火墙
REM ============================================================
echo.
echo  [4/5] 配置 Windows 防火墙...

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [--] 非管理员权限，跳过防火墙 (平板访问可能受限)
    goto :skip_firewall
)

netsh advfirewall firewall add rule name="VoteSys-7003" dir=in action=allow protocol=tcp localport=7003 >nul 2>&1
netsh advfirewall firewall add rule name="VoteSys-3000" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
echo  [OK] 端口 3000/7003 已放行

:skip_firewall

REM ============================================================
REM  第5步：获取IP & 打开网页
REM ============================================================
echo.
echo  [5/5] 打开前端页面...

set IP=localhost
for /f "tokens=2 delims=: " %%a in ('ipconfig ^| findstr /i "IPv4" 2^>nul') do (
    set "TMP=%%a"
    set "TMP=!TMP: =!"
    if not "!TMP!"=="" if not "!TMP!"=="127.0.0.1" (
        set "IP=!TMP!"
    )
)

start http://localhost:3000

echo.
echo  ==========================================
echo    系统启动完成！
echo.
echo    管理端 (本机):  http://localhost:3000
echo    平板端 (局域网): http://!IP!:3000
echo    后端 API:        http://localhost:7003
echo.
echo    请勿关闭新弹出的命令行窗口！
echo    关闭窗口 = 服务停止
echo  ==========================================
echo.
pause
