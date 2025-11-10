# 快速入门指南

## 5分钟快速上手

### 第一步：准备工作

确保你已经安装了 Node.js（v16 或更高版本）。

检查 Node.js 版本：
```bash
node -v
npm -v
```

如果没有安装，请访问 [https://nodejs.org/](https://nodejs.org/) 下载安装。

### 第二步：安装依赖

在项目根目录，双击运行 `install.bat`（Windows）或手动执行：

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

等待安装完成...

### 第三步：配置文件

复制配置文件：
```bash
# Windows
copy server\config.example.json server\config.json

# Linux/Mac
cp server/config.example.json server/config.json
```

编辑 `server/config.json`：
```json
{
  "loginMethod": "qrcode",
  "port": 3000
}
```

⚠️ **推荐使用二维码登录，安全便捷！**

### 第四步：启动服务

#### 方法1：使用脚本（推荐）

双击 `start-dev.bat`（开发模式）

#### 方法2：手动启动

```bash
# 终端1：启动后端
cd server
node app.js

# 终端2：启动前端（可选，开发模式）
cd client
npm run dev
```

看到以下信息说明启动成功：
```
========================================
📱 请使用网易云音乐 APP 扫描二维码登录
========================================

[二维码显示在这里]

💡 如果二维码无法显示，请访问以下链接：
   https://...

⏳ 二维码有效期 2 分钟，等待扫码中...

✓ 二维码登录成功！
✓ 服务器启动成功！

📍 本地访问地址: http://localhost:3000
📱 局域网访问地址: http://192.168.1.100:3000
```

**首次启动时需要扫码登录**：
1. 打开网易云音乐 APP
2. 扫描控制台显示的二维码
3. 在手机上确认登录
4. 登录成功后服务器会继续启动

### 第五步：开始使用

#### 主控设备（连接音响的电脑）
1. 打开浏览器
2. 访问 `http://localhost:3000/player`
3. 连接音响
4. 保持页面打开

#### 其他设备（点歌）
1. 确保在同一局域网内
2. 访问 `http://[服务器IP]:3000/`
3. 搜索歌曲
4. 点击"点歌"按钮

🎵 歌曲会自动加入队列并在主控设备上播放！

## 常见问题

### 登录失败？
- 检查账号密码是否正确
- 确保网络连接正常
- 尝试在网易云官网先登录一次

### 局域网无法访问？
- 检查防火墙设置
- 使用服务器启动时显示的 IP 地址
- 确保所有设备在同一 WiFi

### 歌曲无法播放？
- 可能是 VIP 歌曲（需要 VIP 账号）
- 可能没有版权
- 系统会自动跳到下一首

## 生产环境部署

如果要长期使用，建议构建生产版本：

```bash
# 1. 构建前端
cd client
npm run build

# 2. 启动服务
cd ../server
node app.js
```

或直接运行：
1. 双击 `build.bat` 构建
2. 双击 `start-prod.bat` 启动

## 下一步

- 📖 阅读 [GUIDE.md](GUIDE.md) 了解详细使用方法
- ❓ 查看 [FAQ.md](FAQ.md) 解决常见问题
- 📝 了解 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 进行二次开发

## 需要帮助？

- 查看文档
- 提交 Issue
- 参与讨论

祝你使用愉快！🎉

