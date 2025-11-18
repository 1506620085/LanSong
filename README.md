# 局域网点歌系统

一个基于 Vue.js + Node.js 的局域网点歌系统，使用网易云音乐API，支持中心化播放和多人点歌。

## 功能特点

- 🎵 支持搜索网易云音乐歌曲
- 🎮 中心化播放模式（一台主控设备播放，其他设备点歌）
- 📱 响应式设计，支持手机和电脑访问
- 🔄 实时同步播放队列
- 🎨 美观的用户界面

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus
- **后端**: Node.js + Express + NeteaseCloudMusicApi
- **实时通信**: Socket.io

## 快速开始

> 💡 **首次使用？** 查看 [QUICKSTART.md](QUICKSTART.md) 获取5分钟快速上手指南！

### 1. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 2. 配置文件

复制配置文件模板并编辑：

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
  "port": 3000,
  "adminPassword": "your_secure_password"
}
```

**配置说明**：
- `loginMethod` - 登录方式
  - `"qrcode"` - 二维码登录（推荐）：启动时扫码登录，安全便捷
  - `"password"` - 手机号密码登录：需要配置 `phone` 和 `password` 字段（不推荐，容易被风控）
- `adminPassword` - 管理密码：用于非主机用户访问管理设置（默认：admin123，请务必修改）

⚠️ **安全建议**：
- 推荐使用二维码登录
- 务必修改默认管理密码
- 使用强密码保护管理设置

### 3. 启动服务

#### 开发模式

```bash
# 启动后端服务（终端1）
cd server
npm start

# 启动前端开发服务（终端2）
cd client
npm run dev
```

#### 生产模式

```bash
# 构建前端
cd client
npm run build

# 启动后端（会自动服务前端静态文件）
cd ../server
npm start
```

### 4. 访问应用

- **点歌页面**: http://localhost:3000/ （局域网其他设备使用）
- **主控播放器**: http://localhost:3000/player （连接音响的主控设备）

在局域网内，其他设备访问 `http://[服务器IP]:3000` 即可使用。

## 使用说明

1. 主控设备访问 `/player` 页面，连接音响
2. 其他用户访问 `/` 首页进行点歌
3. 点歌后歌曲会自动加入队列
4. 主控端按照队列顺序自动播放

## 项目结构

```
s-wyy/
├── server/                 # 后端服务
│   ├── app.js             # Express 服务器入口
│   ├── api.js             # 网易云 API 封装
│   ├── queue.js           # 播放队列管理
│   ├── config.json        # 配置文件
│   └── package.json       
├── client/                 # 前端应用
│   ├── src/
│   │   ├── views/
│   │   │   ├── Player.vue      # 主控播放器页面
│   │   │   └── Request.vue     # 点歌页面
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 注意事项

- 需要有效的网易云音乐账号
- 建议使用较新版本的浏览器
- 确保局域网内设备可以相互访问
- 请遵守音乐版权法律，仅供个人学习和研究使用

## 文档

- 🚀 [QUICKSTART.md](QUICKSTART.md) - 5分钟快速入门
- 📖 [README.md](README.md) - 项目说明
- 📘 [GUIDE.md](GUIDE.md) - 详细使用指南
- 📝 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - 项目结构说明
- 🔐 [ADMIN_PASSWORD.md](ADMIN_PASSWORD.md) - 管理密码功能说明
- ❓ [FAQ.md](FAQ.md) - 常见问题解答
- 📋 [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 截图预览

### 点歌页面
待添加：搜索歌曲、查看队列、实时同步

### 主控播放器
待添加：播放控制、队列管理、专辑封面

## 贡献

欢迎提交 Issue 和 Pull Request！

如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！

## License

MIT License - 详见 [LICENSE](LICENSE) 文件

