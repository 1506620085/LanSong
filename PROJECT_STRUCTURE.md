# 项目结构说明

## 目录结构

```
s-wyy/
├── server/                         # 后端服务
│   ├── app.js                     # Express 服务器主入口
│   ├── api.js                     # 网易云音乐 API 封装
│   ├── queue.js                   # 播放队列管理模块
│   ├── config.json                # 配置文件（需要自己创建）
│   ├── config.example.json        # 配置文件模板
│   └── package.json               # 后端依赖配置
│
├── client/                         # 前端应用
│   ├── src/
│   │   ├── views/
│   │   │   ├── Request.vue        # 点歌页面
│   │   │   └── Player.vue         # 主控播放器页面
│   │   ├── router/
│   │   │   └── index.js           # Vue Router 路由配置
│   │   ├── utils/
│   │   │   ├── api.js             # API 请求封装
│   │   │   ├── socket.js          # Socket.io 客户端封装
│   │   │   └── format.js          # 格式化工具函数
│   │   ├── App.vue                # 根组件
│   │   └── main.js                # 前端入口文件
│   ├── index.html                 # HTML 模板
│   ├── vite.config.js             # Vite 配置
│   └── package.json               # 前端依赖配置
│
├── install.bat                     # 一键安装依赖脚本
├── start-dev.bat                   # 启动开发环境脚本
├── build.bat                       # 构建生产版本脚本
├── start-prod.bat                  # 启动生产环境脚本
│
├── README.md                       # 项目说明文档
├── GUIDE.md                        # 详细使用指南
├── PROJECT_STRUCTURE.md            # 项目结构说明（本文件）
└── .gitignore                      # Git 忽略文件配置
```

## 核心文件说明

### 后端（server/）

#### `app.js` - 服务器主入口
- Express 服务器配置
- HTTP 和 WebSocket 服务初始化
- API 路由定义
- 静态文件服务
- 网易云音乐登录逻辑
- Socket.io 事件处理

**主要功能**：
- `/api/search` - 搜索歌曲
- `/api/song/url/:id` - 获取歌曲播放 URL
- `/api/queue/*` - 播放队列管理接口
- WebSocket 实时通信

#### `api.js` - 网易云音乐 API 封装
- 封装网易云音乐 API 调用
- 处理登录和 Cookie 管理
- 提供统一的 API 接口

**主要方法**：
- `login()` - 登录网易云音乐
- `searchSongs()` - 搜索歌曲
- `getSongUrl()` - 获取播放链接
- `getSongDetail()` - 获取歌曲详情
- `getLyric()` - 获取歌词

#### `queue.js` - 播放队列管理
- 管理播放队列
- 处理歌曲的添加、删除、排序
- 维护播放历史

**主要方法**：
- `addSong()` - 添加歌曲到队列
- `removeSong()` - 删除队列中的歌曲
- `playNext()` - 播放下一首
- `playPrevious()` - 播放上一首
- `getState()` - 获取队列状态

#### `config.json` - 配置文件
包含网易云账号和服务器配置：
```json
{
  "phone": "手机号",
  "password": "密码",
  "port": 3000
}
```

### 前端（client/src/）

#### `views/Request.vue` - 点歌页面
用户点歌界面，包含：
- 歌曲搜索功能
- 搜索结果展示
- 当前播放显示
- 播放队列显示
- 点歌按钮
- 实时队列同步

#### `views/Player.vue` - 主控播放器页面
主控设备使用的播放器，包含：
- 大型专辑封面展示
- HTML5 音频播放器
- 播放控制（播放/暂停/上一首/下一首）
- 进度条控制
- 音量调节
- 播放队列管理
- 自动播放下一首
- 实时状态同步

#### `router/index.js` - 路由配置
定义页面路由：
- `/` - 点歌页面
- `/player` - 主控播放器页面

#### `utils/api.js` - API 请求封装
封装所有后端 API 请求：
- Axios 实例配置
- 请求/响应拦截器
- API 方法封装

#### `utils/socket.js` - WebSocket 封装
封装 Socket.io 客户端：
- 连接管理
- 事件监听
- 自动重连

#### `utils/format.js` - 工具函数
格式化函数：
- `formatDuration()` - 格式化时长（毫秒转 mm:ss）
- `formatTime()` - 格式化时间

#### `App.vue` - 根组件
应用根组件，包含：
- 全局样式
- 路由视图容器

#### `main.js` - 应用入口
初始化 Vue 应用：
- 创建 Vue 实例
- 注册 Element Plus
- 注册图标组件
- 挂载路由

### 配置文件

#### `vite.config.js` - Vite 配置
- Vue 插件配置
- 开发服务器配置
- API 代理配置
- 构建输出配置

#### `package.json` - 依赖配置
前端和后端的依赖管理和脚本配置

### 脚本文件

#### `install.bat` - 安装脚本
自动安装前后端依赖

#### `start-dev.bat` - 开发环境启动脚本
同时启动后端服务和前端开发服务

#### `build.bat` - 构建脚本
构建前端生产版本到 `server/public/`

#### `start-prod.bat` - 生产环境启动脚本
启动生产环境（需要先构建）

## 数据流程

### 点歌流程
1. 用户在 Request.vue 搜索歌曲
2. 前端调用 `/api/search` 接口
3. 后端通过 `api.js` 调用网易云 API
4. 返回搜索结果给前端
5. 用户点击"点歌"按钮
6. 前端调用 `/api/queue/add` 接口
7. 后端通过 `queue.js` 添加到队列
8. 通过 Socket.io 广播队列更新
9. 所有客户端实时更新队列显示

### 播放流程
1. Player.vue 监听队列变化
2. 队列有歌曲时调用 `/api/queue/next`
3. 后端返回下一首歌曲信息
4. 前端调用 `/api/song/url/:id` 获取播放链接
5. HTML5 Audio 播放音乐
6. 播放完成后自动播放下一首
7. 通过 Socket.io 广播播放状态

## 技术栈详解

### 后端技术
- **Node.js**: JavaScript 运行环境
- **Express**: Web 服务器框架
- **Socket.io**: WebSocket 实时通信
- **NeteaseCloudMusicApi**: 网易云音乐 API（开源项目）
- **CORS**: 跨域资源共享

### 前端技术
- **Vue 3**: 渐进式 JavaScript 框架（Composition API）
- **Vite**: 新一代前端构建工具
- **Vue Router**: 官方路由管理器
- **Element Plus**: Vue 3 UI 组件库
- **Axios**: HTTP 客户端
- **Socket.io-client**: WebSocket 客户端

## 开发建议

### 后端开发
1. 修改 API 接口：编辑 `server/app.js`
2. 修改队列逻辑：编辑 `server/queue.js`
3. 添加新的音乐源：扩展 `server/api.js`
4. 添加用户认证：在 Express 中间件中实现

### 前端开发
1. 修改页面样式：编辑对应的 `.vue` 文件
2. 添加新页面：在 `views/` 创建新组件，在 `router/index.js` 添加路由
3. 添加新功能：在 `utils/` 创建工具函数
4. 修改主题：在 `App.vue` 修改全局样式

## 扩展建议

### 功能扩展
- [ ] 添加用户系统和点歌权限
- [ ] 支持播放列表导入/导出
- [ ] 添加歌词显示功能
- [ ] 支持多音乐平台（QQ音乐、酷狗等）
- [ ] 添加歌曲评分和推荐系统
- [ ] 支持歌曲预览（试听）
- [ ] 添加黑名单功能
- [ ] 实现投票跳过功能

### 技术优化
- [ ] 使用 TypeScript 重构
- [ ] 添加单元测试
- [ ] 使用 Redis 缓存队列状态
- [ ] 添加日志系统
- [ ] Docker 容器化部署
- [ ] 使用 HTTPS 加密通信
- [ ] 添加性能监控

## 许可证

MIT License

