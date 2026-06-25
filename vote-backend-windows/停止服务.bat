@echo off
chcp 65001 >nul 2>&1
title 停止后端服务
color 0C

echo ============================================
echo    停止科技奖评审表决系统后端服务
echo ============================================
echo.

REM 查找并终止占用 7003 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7003 " ^| findstr "LISTENING"') do (
    echo 正在停止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo 已成功停止进程 %%a
    ) else (
        echo 停止进程 %%a 失败，可能需要管理员权限
    )
)

echo.
echo 操作完成。
pause
