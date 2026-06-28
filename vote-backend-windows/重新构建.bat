@echo off
chcp 65001 >nul 2>&1
title 科技奖评审表决系统 - 重新构建
color 0B

cd /d "%~dp0"

echo ============================================
echo   重新构建后端 JAR 包
echo   （修改 Java 源码后使用）
echo ============================================
echo.

REM ===== 1. 先停止运行中的服务 =====
echo [1/4] 检查并停止运行中的后端服务...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7003 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)
if %FOUND%==1 (
    echo   [OK] 后端服务已停止
    timeout /t 2 /nobreak >nul
) else (
    echo   [OK] 后端未运行
)

REM ===== 2. 删除旧的 build 产物 =====
echo.
echo [2/4] 清理旧的构建产物...
if exist "target" (
    rd /s /q "target" 2>nul
    echo   [OK] target 目录已清理
) else (
    echo   [OK] 无需清理
)

REM ===== 3. 构建 =====
echo.
echo [3/4] 开始 Maven 构建...

REM 检查 Maven
where mvn >nul 2>&1
if %errorlevel% neq 0 (
    echo   [提示] 未找到 Maven，尝试 Maven Wrapper...
    if exist ".mvn\wrapper\maven-wrapper.jar" (
        call mvnw.cmd clean package -DskipTests
    ) else (
        echo   [错误] 未找到 Maven！请安装 Maven 或确保 Maven Wrapper 存在。
        pause
        exit /b 1
    )
) else (
    call mvn clean package -DskipTests
)

if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   构建失败！请检查上方错误信息。
    echo ============================================
    pause
    exit /b 1
)

REM ===== 4. 复制 JAR 到根目录 =====
echo.
echo [4/4] 复制 JAR 到项目根目录...
if exist "target\vote-system-windows.jar" (
    copy /Y "target\vote-system-windows.jar" "..\vote-system-windows.jar" >nul
    echo   [OK] JAR 已复制到根目录
) else (
    echo   [错误] 未找到构建输出的 JAR 文件！
    pause
    exit /b 1
)

echo.
echo ============================================
echo   构建成功！
echo.
echo   JAR 文件: 根目录\vote-system-windows.jar
echo.
echo   现在可以运行"启动服务.bat"启动系统。
echo ============================================
echo.
pause
