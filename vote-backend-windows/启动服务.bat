@echo off
chcp 65001 >nul 2>&1
title 科技奖评审表决系统 - 后端服务
color 0A

echo ============================================
echo    科技奖评审表决系统 - Windows后端服务
echo ============================================
echo.

REM ===== 自动查找 Java 环境 =====
set "JAVA_EXE="

REM 1. 先尝试系统 PATH
where java >nul 2>&1
if %errorlevel% equ 0 (
    set "JAVA_EXE=java"
)

REM 2. 在常见位置搜索 JDK
if "%JAVA_EXE%"=="" (
    echo 正在搜索已安装的 JDK...
    for /d %%d in (
        "%USERPROFILE%\Downloads\microsoft-jdk-*"
        "%USERPROFILE%\Downloads\jdk-*"
        "C:\Program Files\Microsoft\jdk-*"
        "C:\Program Files\Java\jdk-*"
        "C:\Program Files\Eclipse Adoptium\jdk-*"
    ) do (
        if exist "%%d\bin\java.exe" (
            set "JAVA_EXE=%%d\bin\java.exe"
            goto :found_java
        )
        if exist "%%d\java.exe" (
            set "JAVA_EXE=%%d\java.exe"
            goto :found_java
        )
    )
    REM 递归搜索子目录（处理 jdk-XX+XX 这种嵌套结构）
    for /d %%d in (
        "%USERPROFILE%\Downloads\microsoft-jdk-*"
        "%USERPROFILE%\Downloads\jdk-*"
        "C:\Program Files\Microsoft\jdk-*"
        "C:\Program Files\Java\jdk-*"
        "C:\Program Files\Eclipse Adoptium\jdk-*"
    ) do (
        for /d %%e in ("%%d\*") do (
            if exist "%%e\bin\java.exe" (
                set "JAVA_EXE=%%e\bin\java.exe"
                goto :found_java
            )
        )
        for /d %%e in ("%%d\*\*") do (
            if exist "%%e\bin\java.exe" (
                set "JAVA_EXE=%%e\bin\java.exe"
                goto :found_java
            )
        )
    )
)

:found_java
if "%JAVA_EXE%"=="" (
    echo [错误] 未找到 Java 运行环境！
    echo.
    echo 请先安装 JDK 17 或以上版本：
    echo   1. 下载地址: https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip
    echo   2. 解压后放到任意位置，此脚本会自动搜索
    echo   或者安装 .msi 版本: https://learn.microsoft.com/zh-cn/java/openjdk/download
    echo.
    pause
    exit /b 1
)

echo [OK] 找到 Java: %JAVA_EXE%
echo.

REM ===== 检查端口 7003 是否被占用 =====
netstat -ano | findstr ":7003 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [警告] 端口 7003 已被占用，服务可能已经在运行。
    echo 如需重启，请先运行"停止服务.bat"。
    echo.
    pause
    exit /b 1
)

REM ===== 检查 JAR 文件 =====
if not exist "%~dp0vote-system-windows.jar" (
    echo [错误] 未找到 vote-system-windows.jar 文件！
    echo 请确保此 bat 文件与 JAR 文件在同一目录。
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

cd /d "%~dp0"
"%JAVA_EXE%" -jar "%~dp0vote-system-windows.jar" --server.port=7003

echo.
echo 服务已停止。
pause
