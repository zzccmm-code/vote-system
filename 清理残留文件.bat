@echo off
chcp 65001 >nul
echo ============================================
echo   评审表决系统 - 残留文件清理脚本
echo ============================================
echo.
echo 此脚本用于删除以下因系统锁定未能即时删除的文件：
echo   1. tools\ 目录（JDK 构建工具残留，约122MB）
echo   2. vote-backend-windows\target\ 目录（构建输出残留）
echo   3. vote-backend-windows\data\ 目录（测试数据库残留）
echo.
echo 请确保已重启电脑后再运行此脚本。
echo.
pause

echo.
echo [1/3] 正在删除 tools\ 目录...
rd /s /q "%~dp0tools" 2>nul
if exist "%~dp0tools" (
    echo   x 删除失败，请关闭所有 Java 进程后重试
) else (
    echo   v 已删除
)

echo [2/3] 正在删除 vote-backend-windows\target\ 目录...
rd /s /q "%~dp0vote-backend-windows\target" 2>nul
if exist "%~dp0vote-backend-windows\target" (
    echo   x 删除失败，请关闭所有 Java 进程后重试
) else (
    echo   v 已删除
)

echo [3/3] 正在删除 vote-backend-windows\data\ 目录...
rd /s /q "%~dp0vote-backend-windows\data" 2>nul
if exist "%~dp0vote-backend-windows\data" (
    echo   x 删除失败，请关闭所有 Java 进程后重试
) else (
    echo   v 已删除
)

echo.
echo ============================================
echo   清理完成！
echo ============================================
pause
