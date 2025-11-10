@echo off
chcp 65001 >nul
echo ========================================
echo 局域网点歌系统 - 生产模式
echo ========================================
echo.

if not exist "server\public\index.html" (
    echo 错误：未找到构建文件！
    echo 请先运行 build.bat 构建前端应用
    echo.
    pause
    exit /b 1
)

echo 正在启动服务器...
echo 按 Ctrl+C 停止服务
echo.

cd server
node app.js

