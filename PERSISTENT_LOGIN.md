# 持久化登录功能说明

## 功能概述

新增了网易云音乐的持久化登录功能，解决每次重启服务器都需要重新扫码登录的问题。

## 主要功能

### 1. "记住我"选项
- 在二维码登录界面右下角显示"记住我（7天内免登录）"复选框
- 勾选后，登录状态将保存7天
- 不勾选则使用单次登录模式

### 2. 自动登录
- 服务器启动时自动检查保存的登录状态
- 如果Cookie有效，自动恢复登录状态
- 无需重新扫码，直接进入已登录状态

### 3. Cookie管理
- Cookie保存在 `server/cookie.json` 文件中
- 包含过期时间，超过7天自动失效
- 退出登录时自动清除保存的Cookie

## 使用方法

### 首次登录

1. 启动服务器
```bash
cd server
npm start
```

2. 在前端页面点击登录
3. 扫描二维码
4. **勾选"记住我"复选框** ✓
5. 在手机上确认登录
6. 登录成功，提示"登录成功！7天内免登录"

### 自动登录

1. 关闭服务器（Ctrl+C）
2. 重新启动服务器
```bash
npm start
```

3. 控制台显示：
```
🔑 检查保存的登录状态...
✓ 已加载保存的Cookie
✓ 自动登录成功！欢迎 [用户名]
```

4. 无需再次扫码，直接可用

### 不使用持久化登录

如果不勾选"记住我"：
- 登录成功后不保存Cookie
- 重启服务器后需要重新登录
- 与之前的单次登录逻辑一致

## 技术实现

### 后端实现

#### 1. Cookie存储 (`api.js`)

```javascript
// 保存Cookie到文件
saveCookieToFile(cookie) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
  const data = { cookie, expiresAt, savedAt: new Date().toISOString() };
  fs.writeFileSync('cookie.json', JSON.stringify(data, null, 2));
}

// 从文件加载Cookie
loadCookieFromFile() {
  const data = JSON.parse(fs.readFileSync('cookie.json'));
  if (Date.now() > data.expiresAt) {
    // Cookie已过期
    fs.unlinkSync('cookie.json');
    return { success: false };
  }
  this.cookie = data.cookie;
  this.isLoggedIn = true;
  return { success: true };
}
```

#### 2. 登录接口修改 (`app.js`)

```javascript
// 查询二维码状态时支持rememberMe参数
app.get('/api/auth/qr/status', async (req, res) => {
  const { key, rememberMe } = req.query;
  const remember = rememberMe === 'true';
  const status = await musicApi.checkQRCodeStatus(key, remember);
  res.json(status);
});
```

#### 3. 启动时自动登录

```javascript
async function startServer() {
  // 尝试加载保存的Cookie
  const loadResult = musicApi.loadCookieFromFile();
  if (loadResult.success) {
    const status = await musicApi.checkLoginStatus();
    if (status.isLoggedIn) {
      console.log('✓ 自动登录成功');
    }
  }
}
```

### 前端实现

#### 1. 登录对话框 (`LoginDialog.vue`)

```vue
<template>
  <div class="qr-wrap">
    <img :src="qrImg" class="qr" />
    <!-- 记住我选项 -->
    <div class="remember-me">
      <el-checkbox v-model="rememberMe" size="small">
        记住我（7天内免登录）
      </el-checkbox>
    </div>
  </div>
</template>

<script setup>
const rememberMe = ref(false)

const startPolling = () => {
  poller.value = setInterval(async () => {
    const res = await checkQrStatus(qrKey.value, rememberMe.value)
    if (res.status === 'success') {
      if (rememberMe.value) {
        ElMessage.success('登录成功！7天内免登录')
      }
    }
  }, 3000)
}
</script>
```

#### 2. API调用 (`api.js`)

```javascript
checkAuthQr(key, rememberMe = false) {
  return api.get('/api/auth/qr/status', { params: { key, rememberMe } })
}
```

## 数据存储

### Cookie文件结构

文件位置：`server/cookie.json`

```json
{
  "cookie": "MUSIC_U=...; __csrf=...",
  "expiresAt": 1699999999999,
  "savedAt": "2024-01-01T00:00:00.000Z"
}
```

字段说明：
- `cookie`: 网易云音乐的登录Cookie
- `expiresAt`: 过期时间戳（毫秒）
- `savedAt`: 保存时间（ISO格式）

### 安全考虑

1. **文件权限**：Cookie文件已添加到 `.gitignore`，不会提交到代码仓库
2. **过期机制**：超过7天自动失效，需要重新登录
3. **退出清理**：退出登录时自动删除Cookie文件
4. **本地存储**：仅保存在服务器本地，不传输到客户端

## 常见问题

### Q1: Cookie保存在哪里？
A: 保存在 `server/cookie.json` 文件中，仅在服务器端存储。

### Q2: 多久会过期？
A: 7天。超过7天后，下次启动服务器时会提示Cookie已过期，需要重新登录。

### Q3: 如何手动清除登录状态？
A: 有两种方式：
- 方式1：在前端点击"退出登录"按钮
- 方式2：手动删除 `server/cookie.json` 文件

### Q4: 如果不勾选"记住我"会怎样？
A: 登录成功后不会保存Cookie，重启服务器需要重新扫码登录。

### Q5: Cookie文件会被提交到Git吗？
A: 不会。`cookie.json` 已添加到 `.gitignore`，确保不会提交敏感信息。

### Q6: 切换账号怎么办？
A: 先退出登录（会自动清除Cookie），然后重新登录即可。

### Q7: 服务器重启后还是要求登录？
A: 检查以下几点：
- 是否勾选了"记住我"
- Cookie是否已过期（7天）
- `server/cookie.json` 文件是否存在

## 故障排查

### 问题：自动登录失败

1. 检查Cookie文件是否存在
```bash
ls server/cookie.json
```

2. 检查Cookie是否过期
```bash
cat server/cookie.json
# 查看 expiresAt 时间戳
```

3. 查看服务器启动日志
```
⚠️  保存的Cookie已过期    # Cookie超过7天
⚠️  Cookie无效，需要重新登录  # Cookie失效
ℹ️  未找到保存的登录信息     # 文件不存在
```

### 问题：登录后立即失效

可能原因：
- 网易云服务器检测到异常登录
- Cookie被其他程序修改
- 网易云账号在其他地方登录

解决方法：
- 重新扫码登录
- 检查账号安全设置

## 更新日志

### v1.1.0 (2024-11-11)
- ✅ 添加"记住我"功能
- ✅ 支持7天持久化登录
- ✅ 服务器启动时自动登录
- ✅ 退出登录时清除Cookie
- ✅ Cookie过期自动清理

## 文件清单

### 新增文件
- `server/cookie.json` - Cookie存储文件（自动生成，不提交到Git）
- `PERSISTENT_LOGIN.md` - 功能说明文档（本文件）

### 修改文件
- `server/api.js` - 添加Cookie持久化方法
- `server/app.js` - 添加启动时自动登录
- `client/src/components/LoginDialog.vue` - 添加"记住我"复选框
- `client/src/utils/auth.js` - 支持rememberMe参数
- `client/src/utils/api.js` - 支持rememberMe参数
- `.gitignore` - 添加cookie.json

## 注意事项

1. **安全性**：Cookie包含登录凭证，请妥善保管服务器
2. **有效期**：7天后需要重新登录，这是出于安全考虑
3. **多设备**：同一账号在多个服务器上登录可能导致Cookie失效
4. **备份**：不要备份或分享 `cookie.json` 文件
5. **权限**：确保 `server` 目录有写入权限

## 后续优化建议

1. 添加Cookie加密存储
2. 支持自定义有效期
3. 添加Cookie刷新机制
4. 支持多账号切换
5. 添加登录日志记录
