@echo off
chcp 65001 >nul
echo ========================================
echo 局域网点歌系统 - 构建生产版本
echo ========================================
echo.

echo 正在构建前端应用...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo 构建失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo ✓ 构建完成！
echo ========================================
echo.
echo 前端文件已输出到: server/public/
echo 运行 start-prod.bat 启动生产服务
echo.
pause

