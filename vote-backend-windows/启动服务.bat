@echo off
chcp 65001 >nul 2>&1
title 科技奖评审表决系统 - 启动服务

echo ============================================
echo   国网四川省电力公司科技奖励评审系统
echo   启动后端 + 前端服务
echo ============================================
echo.

cd /d "%~dp0"

REM ===== 检测 Java =====
set JAVA=
set JDK_PATHS="%USERPROFILE%\Downloads\microsoft-jdk-17.0.11-windows-x64\jdk-17.0.11+9\bin\java.exe" "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\bin\java.exe"

for %%p in (%JDK_PATHS%) do (
    if exist %%p set JAVA=%%p
)
if "%JAVA%"=="" (
    where java >nul 2>&1
    if not errorlevel 1 set JAVA=java
)
if "%JAVA%"=="" (
    echo [错误] 未找到 Java 17！请先安装 JDK 17。
    echo   下载: https://learn.microsoft.com/zh-cn/java/openjdk/download
    pause
    exit /b 1
)
echo [OK] Java 环境已就绪

REM ===== 1. 启动后端 =====
echo.
echo [1/2] 启动后端服务 (端口 7003) ...

if not exist "vote-system-windows.jar" (
    echo [错误] 未找到 vote-system-windows.jar！
    echo   请运行"重新构建.bat"生成 JAR 包。
    pause
    exit /b 1
)

start "VoteBackend-7003" "%JAVA%" -jar "%~dp0vote-system-windows.jar" --server.port=7003
echo [OK] 后端服务已在新窗口启动

REM ===== 2. 启动前端 =====
echo.
echo [2/2] 启动前端服务 (端口 3000) ...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js！请先安装 Node.js。
    echo   下载: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "..\server.js" (
    echo [错误] 未找到根目录的 server.js！
    pause
    exit /b 1
)

start "VoteFrontend-3000" /D "%~dp0.." node server.js
echo [OK] 前端服务已在新窗口启动

echo.
echo ============================================
echo   系统启动完成！
echo   管理端:  http://localhost:3000
echo   后端API: http://localhost:7003
echo.
echo   !! 不要关闭新弹出的两个命令行窗口 !!
echo ============================================
echo.
pause
