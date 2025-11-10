@echo off
chcp 65001 >nul
echo ========================================
echo 局域网点歌系统 - 开发模式
echo ========================================
echo.

echo 正在启动后端服务和前端开发服务...
echo 按 Ctrl+C 停止服务
echo.

start "后端服务" cmd /k "cd server && node app.js"
timeout /t 3 /nobreak >nul
start "前端开发" cmd /k "cd client && npm run dev"

echo.
echo 服务已启动！
echo - 后端: http://localhost:3000
echo - 前端开发: http://localhost:5173
echo.

