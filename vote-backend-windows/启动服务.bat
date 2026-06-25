@echo off
chcp 65001 >nul 2>&1
title 科技奖评审表决系统 - 后端服务
color 0A

echo ============================================
echo    科技奖评审表决系统 - Windows后端服务
echo ============================================
echo.

REM ===== 检查 Java 环境 =====
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Java 运行环境！
    echo.
    echo 请先安装 JDK 17 或以上版本：
    echo   1. 下载地址: https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip
    echo   2. 解压后将 bin 目录添加到系统 PATH 环境变量
    echo   或者安装 .msi 版本: https://learn.microsoft.com/zh-cn/java/openjdk/download
    echo.
    pause
    exit /b 1
)

REM ===== 检查端口 7003 是否被占用 =====
netstat -ano | findstr ":7003 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [警告] 端口 7003 已被占用，服务可能已经在运行。
    echo 如需重启，请先运行"停止服务.bat"。
    echo.
    pause
    exit /b 1
)

REM ===== 启动服务 =====
echo 正在启动后端服务...
echo.
echo 服务地址: http://localhost:7003
echo H2数据库控制台: http://localhost:7003/h2-console
echo.
echo 按 Ctrl+C 可停止服务
echo ============================================
echo.

java -jar vote-system-windows.jar --server.port=7003

echo.
echo 服务已停止。
pause
