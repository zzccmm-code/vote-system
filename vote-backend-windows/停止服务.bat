@echo off
chcp 65001 >nul 2>&1
title 科技奖评审表决系统 - 停止服务
color 0E

echo ============================================
echo   停止科技奖评审表决系统所有服务
echo ============================================
echo.

REM ===== 1. 停止 Node.js 前端 =====
echo [1/3] 停止前端服务 (端口 3000) ...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo   正在停止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] 前端已停止
    ) else (
        echo   [失败] 无法停止 PID %%a
    )
    set FOUND=1
)
if %FOUND%==0 echo   [提示] 未发现运行中的前端服务

REM ===== 2. 停止 Java 后端 =====
echo.
echo [2/3] 停止后端服务 (端口 7003) ...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7003 " ^| findstr "LISTENING"') do (
    echo   正在停止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] 后端已停止
    ) else (
        echo   [失败] 无法停止 PID %%a，尝试强制终止所有 Java 进程...
        taskkill /F /IM java.exe >nul 2>&1
        echo   [OK] 所有 Java 进程已终止
    )
    set FOUND=1
)
if %FOUND%==0 echo   [提示] 未发现运行中的后端服务

REM ===== 3. 关闭服务窗口 =====
echo.
echo [3/3] 关闭服务命令行窗口 ...
taskkill /FI "WINDOWTITLE eq VoteBackend-7003*" >nul 2>&1
taskkill /FI "WINDOWTITLE eq VoteFrontend-3000*" >nul 2>&1

echo.
echo ============================================
echo   所有服务已停止！
echo ============================================
echo.
pause
