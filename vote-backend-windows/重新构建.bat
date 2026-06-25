@echo off
chcp 65001 >nul 2>&1
title 重新构建后端JAR包
color 0B

echo ============================================
echo    重新构建后端 JAR 包（修改源码后使用）
echo ============================================
echo.

REM ===== 检查 Java 环境 =====
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Java 运行环境！请先安装 JDK 17。
    pause
    exit /b 1
)

REM ===== 检查 Maven =====
where mvn >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 未找到 Maven，尝试使用 Maven Wrapper...
    if exist ".mvn\wrapper\maven-wrapper.jar" (
        echo 找到 Maven Wrapper，开始构建...
        call mvnw.cmd clean package -DskipTests
    ) else (
        echo [错误] 未找到 Maven 和 Maven Wrapper！
        echo 请安装 Maven: https://maven.apache.org/download.cgi
        pause
        exit /b 1
    )
) else (
    echo 找到 Maven，开始构建...
    call mvn clean package -DskipTests
)

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo 构建成功！
    echo JAR 文件: target\vote-system-windows.jar
    echo.
    echo 正在复制到项目根目录...
    copy /Y "target\vote-system-windows.jar" "vote-system-windows.jar" >nul
    echo 完成！可以运行"启动服务.bat"了。
    echo ============================================
) else (
    echo.
    echo ============================================
    echo 构建失败！请检查错误信息。
    echo ============================================
)

echo.
pause
