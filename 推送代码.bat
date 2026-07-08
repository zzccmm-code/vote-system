@echo off
chcp 65001 >nul 2>&1
title 推送代码到 GitHub

cd /d "%~dp0"

echo ============================================
echo   推送代码到 GitHub
echo   仓库: https://github.com/zzccmm-code/vote-system
echo ============================================
echo.

echo [1/2] 配置 Git 认证...
gh auth setup-git 2>nul
if errorlevel 1 (
    echo [失败] gh 未正确配置，请先运行 gh auth login
    pause
    exit /b 1
)
echo [OK]

echo [2/2] 推送到远程仓库...
git push -u origin main
if errorlevel 1 (
    echo [失败] 推送失败，请检查网络或仓库权限
) else (
    echo [OK] 推送成功！
)

echo.
pause
