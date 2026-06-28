@echo off
REM 便捷入口 → 调用 vote-backend-windows 下的启动脚本
cd /d "%~dp0vote-backend-windows"
call "启动服务.bat"
