@echo off
chcp 65001 >nul
echo ========================================
echo 局域网点歌系统 - 安装依赖
echo ========================================
echo.

echo [1/2] 安装后端依赖...
cd server
call yarn
if %errorlevel% neq 0 (
    echo 后端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] 安装前端依赖...
cd client
call yarn
if %errorlevel% neq 0 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo ✓ 依赖安装完成！
echo ========================================
echo.
echo 下一步：
echo 1. 编辑 server/config.json 配置网易云账号
echo 2. 运行 start-dev.bat 启动开发服务
echo    或运行 start-prod.bat 启动生产服务
echo.
pause

