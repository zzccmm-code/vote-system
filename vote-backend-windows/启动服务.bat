@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title 科技奖评审表决系统 - 一键启动
color 0A

set "ROOT=%~dp0.."

echo.
echo  ==========================================
echo    国网四川省电力公司科技奖励评审系统
echo    一键启动 (环境检测 + 启动 + 防火墙 + 打开页面)
echo  ==========================================
echo.

REM ============================================================
REM  第1步：环境检测
REM ============================================================
echo  [1/5] 检测运行环境...

REM --- Java ---
set JAVA=
for %%p in (
    "%USERPROFILE%\Downloads\microsoft-jdk-17.0.11-windows-x64\jdk-17.0.11+9\bin\java.exe"
    "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe"
    "C:\Program Files\Java\jdk-17\bin\java.exe"
    "C:\Program Files\Eclipse Adoptium\jdk-17.0.14.7-hotspot\bin\java.exe"
) do if exist %%p set JAVA=%%p
if "%JAVA%"=="" (
    where java >nul 2>&1 && set JAVA=java
)
if "%JAVA%"=="" (
    echo  [错误] 未找到 Java 17！
    echo         请下载安装: https://learn.microsoft.com/zh-cn/java/openjdk/download
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('"%JAVA%" -version 2^>^&1') do ( echo  [OK] Java: %%i & goto :java_ok )
:java_ok

REM --- Node.js ---
set NODE=
where node >nul 2>&1 && set NODE=node
if "%NODE%"=="" (
    echo  [错误] 未找到 Node.js！
    echo         请下载安装: https://nodejs.org/
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo  [OK] Node.js: %%i

REM --- 检查文件 ---
if not exist "%ROOT%\vote-system-windows.jar" (
    echo  [错误] 未找到 vote-system-windows.jar！
    echo         请先运行 vote-backend-windows\重新构建.bat
    pause & exit /b 1
)
if not exist "%ROOT%\server.js" (
    echo  [错误] 未找到 server.js！
    pause & exit /b 1
)
echo  [OK] 所有文件就绪

REM ============================================================
REM  第2步：先停掉旧服务
REM ============================================================
echo.
echo  [2/5] 清理旧服务...

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7003 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo  [OK] 旧服务已清理

REM ============================================================
REM  第3步：启动系统
REM ============================================================
echo.
echo  [3/5] 启动系统...

REM 启动后端
echo   - 启动后端 (端口 7003) ...
start "VoteBackend" "%JAVA%" -jar "%ROOT%\vote-system-windows.jar" --server.port=7003

REM 等后端启动
echo   - 等待后端就绪 ...
set /a wait_count=0
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:7003/voteRound/current >nul 2>&1
if %errorlevel% equ 0 goto :backend_ready
set /a wait_count+=1
if %wait_count% lss 15 goto :wait_backend
echo  [警告] 后端启动超时，继续启动前端...
:backend_ready
echo  [OK] 后端已就绪

REM 启动前端
echo   - 启动前端 (端口 3000) ...
start "VoteFrontend" /D "%ROOT%" node server.js
timeout /t 2 /nobreak >nul
echo  [OK] 前端已启动

REM ============================================================
REM  第4步：配置防火墙
REM ============================================================
echo.
echo  [4/5] 配置 Windows 防火墙...

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [提示] 当前非管理员权限，跳过防火墙配置
    echo         如需平板访问，请以管理员身份运行此脚本
    goto :skip_firewall
)

netsh advfirewall firewall add rule name="投票系统-后端7003" dir=in action=allow protocol=tcp localport=7003 >nul 2>&1
if %errorlevel% equ 0 ( echo  [OK] 端口 7003 已放行 ) else ( echo  [提示] 端口 7003 可能已存在规则 )

netsh advfirewall firewall add rule name="投票系统-前端3000" dir=in action=allow protocol=tcp localport=3000 >nul 2>&1
if %errorlevel% equ 0 ( echo  [OK] 端口 3000 已放行 ) else ( echo  [提示] 端口 3000 可能已存在规则 )

:skip_firewall

REM ============================================================
REM  第5步：显示信息 & 打开网页
REM ============================================================
echo.
echo  [5/5] 打开前端页面...

REM 获取本机IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    if not "!IP!"=="127.0.0.1" if not "!IP!"=="0.0.0.0" goto :got_ip
)
:got_ip
if "%IP%"=="" set IP=localhost

start http://localhost:3000

echo.
echo  ==========================================
echo    系统启动完成！
echo.
echo    管理端 (本机):  http://localhost:3000
echo    平板端 (局域网): http://%IP%:3000
echo    后端 API:        http://localhost:7003
echo.
echo    重要：请勿关闭弹出的两个命令行窗口！
echo          关闭窗口将导致服务停止。
echo  ==========================================
echo.
pause
