# 客户端独立登录功能说明

## 功能概述

在原有的"主机全局登录"基础上，新增了**"本机用户独立登录"**功能。每个客户端可以独立登录自己的网易云账号，用于访问个人数据（如喜欢的歌曲、创建的歌单等）。

## 功能区别

### 1. 主机全局登录（右侧"登录用户信息"）
- **用途**：用于系统全局功能（搜索歌曲、获取播放链接等）
- **范围**：整个系统共享一个登录状态
- **位置**：导航栏右侧
- **特点**：主机用户操作，所有客户端共用

### 2. 本机用户独立登录（本机用户信息右侧的网易云登录）
- **用途**：用于获取个人数据（喜欢的歌曲、创建的歌单）
- **范围**：每个客户端独立管理自己的登录状态
- **位置**：本机用户信息区域右侧
- **特点**：每个IP地址独立登录，互不干扰

## 使用场景

1. **个人歌单访问**：每个用户可以登录自己的账号，查看和添加自己的歌单
2. **喜欢歌曲同步**：登录后可以将喜欢的歌曲同步到网易云账号
3. **个性化推荐**：基于个人账号获取推荐歌曲
4. **多用户场景**：多人使用时，每人可以用自己的账号，不影响他人

## 技术实现

### 后端实现

#### 1. 客户端Cookie管理器 (`client-auth-manager.js`)
- 为每个IP地址存储独立的Cookie
- 支持Cookie持久化（7天有效期）
- 自动清理过期Cookie
- 支持"记住我"功能

```javascript
// 主要功能
- getClientCookie(ip)          // 获取指定IP的Cookie
- setClientCookie(ip, cookie)  // 设置指定IP的Cookie
- removeClientCookie(ip)       // 删除指定IP的Cookie
- isClientLoggedIn(ip)         // 检查指定IP是否已登录
```

#### 2. API路由 (`app.js`)

新增的API端点：

```javascript
GET  /api/local-auth/qr/new        // 生成登录二维码
GET  /api/local-auth/qr/status     // 查询二维码状态
GET  /api/local-auth/status        // 获取登录状态
POST /api/local-auth/logout        // 退出登录
GET  /api/local-auth/cookie        // 获取Cookie（内部使用）
```

### 前端实现

#### 1. 本机登录状态管理 (`localAuth.js`)
```javascript
// 状态管理
export const localAuthState = reactive({
  isLoggedIn: false,
  profile: null
})

// 主要方法
- fetchLocalAuthStatus()      // 获取登录状态
- localLogout()               // 退出登录
- createLocalQr()             // 创建二维码
- checkLocalQrStatus()        // 检查二维码状态
```

#### 2. UI组件

##### NavBar.vue
- 在"本机用户信息"右侧显示登录状态
- 未登录时显示"网易云未登录"按钮
- 已登录时显示头像和昵称

##### LocalLoginDialog.vue
- 二维码登录对话框
- 实时显示扫码状态
- 支持"记住我"功能
- 自动轮询检查登录状态

## 数据存储

### 后端存储
文件：`server/client-cookies.json`

```json
{
  "192.168.1.100": {
    "cookie": "MUSIC_U=...; ...",
    "expiresAt": 1700000000000,
    "savedAt": "2025-11-18T15:30:00.000Z",
    "rememberMe": true
  }
}
```

### 前端状态
- 使用Vue3的reactive状态管理
- 自动同步到所有使用该状态的组件
- 页面刷新时从后端重新获取

## 安全特性

1. **IP隔离**：每个IP的Cookie独立存储，互不影响
2. **自动过期**：Cookie有效期7天（记住我）或24小时
3. **状态验证**：每次请求都验证Cookie有效性
4. **自动清理**：过期Cookie自动删除

## UI设计

### 未登录状态
```
[本机用户信息卡片] [网易云未登录按钮] | [主机登录状态]
```

### 已登录状态
```
[本机用户信息卡片] [头像+昵称] | [主机登录状态]
```

### 样式特点
- 使用紫色系配色（与本机用户信息一致）
- 圆角设计，hover效果
- 头像尺寸24px，紧凑布局
- 下拉菜单提供退出选项

## 使用流程

1. 用户点击"网易云未登录"按钮
2. 弹出登录对话框，显示二维码
3. 用户使用网易云APP扫描二维码
4. 在手机上确认登录
5. 前端轮询检测到登录成功
6. 更新登录状态，显示头像和昵称
7. Cookie保存到后端（按IP地址）

## 后续扩展

基于此登录功能，可以扩展以下特性：

1. **个人歌单**：获取并展示用户的歌单列表
2. **喜欢同步**：点歌时可以同步到"我喜欢的音乐"
3. **播放历史**：查看个人播放历史
4. **推荐歌曲**：基于个人口味推荐
5. **评论互动**：查看和发表歌曲评论

## API使用示例

### 前端调用示例

```javascript
import { localAuthState, fetchLocalAuthStatus, localLogout } from '@/utils/localAuth'

// 获取登录状态
await fetchLocalAuthStatus()

// 检查是否已登录
if (localAuthState.isLoggedIn) {
  console.log('已登录:', localAuthState.profile.nickname)
}

// 退出登录
await localLogout()
```

### 后端使用示例

```javascript
const clientAuthManager = require('./client-auth-manager')

// 获取客户端Cookie
const ip = getClientIP(req)
const cookie = clientAuthManager.getClientCookie(ip)

// 使用Cookie调用网易云API
const result = await likelist({
  uid: userId,
  cookie: cookie
})
```

## 注意事项

1. **Cookie隔离**：本机用户登录的Cookie仅用于个人数据访问，不影响全局功能
2. **多设备支持**：同一个用户可以在不同设备上登录不同账号
3. **隐私保护**：每个用户的Cookie独立存储，其他用户无法访问
4. **自动清理**：长时间未使用的Cookie会自动过期并清理

## 测试建议

1. **基础测试**
   - 扫码登录流程是否正常
   - 登录状态是否正确显示
   - 退出登录是否成功

2. **持久化测试**
   - Cookie是否正确保存
   - 页面刷新后状态是否保持
   - "记住我"功能是否有效

3. **多客户端测试**
   - 不同IP登录不同账号
   - 互不干扰
   - Cookie隔离是否有效

4. **异常测试**
   - Cookie过期处理
   - 网络错误处理
   - 二维码过期重试

## 更新日志

### v1.1.0 (2025-11-18)
- ✨ 新增客户端独立登录功能
- 🔐 支持每个IP独立管理网易云登录状态
- 📱 二维码扫码登录
- 💾 Cookie持久化存储
- 🎨 优化UI设计，与现有风格一致
