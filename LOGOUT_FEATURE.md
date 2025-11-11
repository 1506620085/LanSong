# 退出登录功能说明

## 功能概述

优化了网易云音乐的退出登录功能，支持鼠标悬停显示下拉菜单，退出时自动清除持久化登录数据。

## 主要功能

### 1. 鼠标悬停触发下拉菜单 ✅
- **触发方式**：鼠标指向登录用户信息位置
- **响应速度**：即时显示下拉菜单
- **视觉反馈**：
  - 用户信息区域背景变浅
  - 下箭头图标向下移动
  - 平滑过渡动画

### 2. 退出登录功能 ✅
- **操作步骤**：
  1. 鼠标悬停在用户头像/昵称区域
  2. 自动显示下拉菜单
  3. 点击"退出登录"按钮
  4. 显示"已退出登录"提示

- **清理内容**：
  - ✅ 清除内存中的Cookie
  - ✅ 删除保存的 `cookie.json` 文件
  - ✅ 清除登录状态
  - ✅ 清除用户资料
  - ✅ 广播登录状态更新

### 3. 刷新资料功能 ✅
- 重新获取用户信息
- 更新头像和昵称
- 显示"资料刷新成功"提示

## 使用方法

### 退出登录操作

#### 方式1：鼠标悬停（推荐）
```
1. 将鼠标移动到右上角的用户头像/昵称区域
2. 等待下拉菜单自动显示（无需点击）
3. 点击"退出登录"
4. 看到"已退出登录"提示
```

#### 界面布局
```
┌─────────────────────────────────────┐
│  [Logo] [导航]    [本机用户] | [👤昵称 ▼] │ ← 鼠标悬停这里
└─────────────────────────────────────┘
                                    ↓
                        ┌─────────────────┐
                        │ 刷新资料        │
                        │ ───────────     │
                        │ 退出登录        │ ← 点击这里
                        └─────────────────┘
```

### 退出后的状态

1. **界面变化**
   - 用户头像/昵称消失
   - 显示"未登录"按钮
   - 本机用户信息保持不变（仅退出网易云账号）

2. **数据清理**
   - `server/cookie.json` 文件被删除
   - 下次启动服务器需要重新登录
   - 即使之前勾选了"记住我"也会被清除

3. **功能影响**
   - 无法获取歌曲URL（需要登录）
   - 无法搜索歌曲（需要登录）
   - 本机点歌功能不受影响

## 技术实现

### 前端实现

#### 1. 下拉菜单（NavBar.vue）

```vue
<template>
  <div v-if="authState.isLoggedIn && authState.profile" class="user">
    <!-- 使用hover触发 -->
    <el-dropdown trigger="hover" @command="handleCommand">
      <div class="user-info-trigger">
        <img :src="authState.profile.avatarUrl + '?param=40y40'" class="avatar" />
        <span class="name">{{ authState.profile.nickname }}</span>
        <el-icon class="arrow-icon"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="refresh">刷新资料</el-dropdown-item>
          <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
// 处理下拉菜单命令
async function handleCommand(command) {
  if (command === 'refresh') {
    await fetchAuthStatus()
    ElMessage.success('资料刷新成功')
  } else if (command === 'logout') {
    try {
      await logout()
      ElMessage.success('已退出登录')
    } catch (error) {
      ElMessage.error('退出失败')
    }
  }
}
</script>
```

**关键点：**
- `trigger="hover"` - 鼠标悬停触发
- `@command` - 统一处理菜单命令
- `divided` - 分隔线样式

#### 2. 退出逻辑（auth.js）

```javascript
export async function logout() {
  try {
    await api.logout()  // 调用后端API
  } finally {
    // 清除前端状态
    authState.isLoggedIn = false
    authState.profile = null
  }
}
```

#### 3. 样式优化

```css
.user-info-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-info-trigger:hover {
  background: rgba(0, 0, 0, 0.05);  /* 悬停背景 */
}

.arrow-icon {
  font-size: 12px;
  color: #999;
  transition: transform 0.3s;
}

.user-info-trigger:hover .arrow-icon {
  transform: translateY(2px);  /* 下箭头动画 */
}
```

### 后端实现

#### 1. 退出登录接口（app.js）

```javascript
// 退出登录
app.post('/api/auth/logout', (req, res) => {
  musicApi.logout();  // 调用API管理器的logout
  io.emit('auth-status', { isLoggedIn: false });  // 广播状态
  res.json({ success: true });
});
```

#### 2. Cookie清理（api.js）

```javascript
// 退出登录（清理内存态和保存的Cookie）
logout() {
  this.cookie = '';
  this.isLoggedIn = false;
  this.clearSavedCookie();  // 删除cookie.json文件
}

// 清除保存的Cookie文件
clearSavedCookie() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      fs.unlinkSync(COOKIE_FILE);  // 删除文件
      console.log('✓ 已清除保存的Cookie');
    }
    return { success: true };
  } catch (error) {
    console.error('✗ 清除Cookie失败:', error.message);
    return { success: false, error: error.message };
  }
}
```

## 功能对比

### 退出前
```
✓ 已登录网易云账号
✓ cookie.json 文件存在
✓ 7天内免登录
✓ 可以搜索歌曲
✓ 可以获取播放URL
```

### 退出后
```
✗ 未登录
✗ cookie.json 文件已删除
✗ 需要重新扫码登录
✗ 无法搜索歌曲
✗ 无法获取播放URL
✓ 本机点歌功能正常
```

## 交互细节

### 1. 下拉菜单动画
- **展开**：淡入 + 向下滑动
- **收起**：淡出 + 向上滑动
- **持续时间**：200ms

### 2. 悬停效果
- **背景变化**：从透明到浅灰（rgba(0, 0, 0, 0.05)）
- **箭头动画**：向下移动2px
- **过渡时间**：300ms

### 3. 提示消息
- **退出成功**：绿色提示"已退出登录"
- **退出失败**：红色提示"退出失败"
- **刷新成功**：绿色提示"资料刷新成功"

## 常见问题

### Q1: 为什么要用hover而不是click？
A: 
- hover更符合常见的下拉菜单交互习惯
- 减少点击次数，操作更便捷
- 与主流网站的交互方式一致

### Q2: 退出登录后本机用户信息会清除吗？
A: 不会。退出登录只清除网易云账号的登录状态，本机用户信息（IP和用户名）不受影响。

### Q3: 退出后如何重新登录？
A: 
1. 点击右上角"未登录"按钮
2. 扫描二维码
3. 如需7天免登录，勾选"记住我"

### Q4: 退出时会清除"记住我"的设置吗？
A: 是的。退出登录会删除 `cookie.json` 文件，即使之前勾选了"记住我"，下次也需要重新登录。

### Q5: 多个客户端同时登录会怎样？
A: 
- 网易云可能会使旧的Cookie失效
- 建议在不同设备间不要同时登录
- 退出登录只影响当前服务器

### Q6: 下拉菜单不显示怎么办？
A: 检查以下几点：
- 确认已经登录网易云账号
- 鼠标是否正确悬停在用户信息区域
- 刷新页面重试

## 安全考虑

1. **Cookie清理**：退出时彻底删除保存的Cookie
2. **状态同步**：通过WebSocket广播登录状态变化
3. **权限控制**：未登录时禁止访问需要登录的功能
4. **错误处理**：退出失败时显示错误提示

## 后续优化建议

1. 添加退出确认对话框（可选）
2. 支持快捷键退出（如 Ctrl+Q）
3. 记录退出日志
4. 支持多账号切换
5. 添加"切换账号"功能（不清除本机用户信息）

## 更新日志

### v1.2.0 (2024-11-11)
- ✅ 改进下拉菜单为hover触发
- ✅ 优化用户信息区域样式
- ✅ 添加下箭头动画效果
- ✅ 完善退出登录功能
- ✅ 确保清除持久化Cookie
- ✅ 添加操作成功提示

## 文件变更

### 修改文件
- `client/src/components/NavBar.vue` - 改进下拉菜单交互
- `client/src/utils/auth.js` - 优化退出逻辑
- `server/api.js` - 确保清除Cookie文件
- `server/app.js` - 广播登录状态

### 新增文件
- `LOGOUT_FEATURE.md` - 退出登录功能说明文档（本文件）

## 测试验证

### 测试步骤

1. **测试悬停触发**
   ```
   ✓ 鼠标移到用户信息区域
   ✓ 下拉菜单自动显示
   ✓ 移开鼠标，菜单自动隐藏
   ```

2. **测试退出登录**
   ```
   ✓ 点击"退出登录"
   ✓ 显示"已退出登录"提示
   ✓ 界面显示"未登录"
   ✓ 检查 server/cookie.json 已删除
   ```

3. **测试持久化清除**
   ```
   ✓ 使用"记住我"登录
   ✓ 验证 cookie.json 存在
   ✓ 退出登录
   ✓ 验证 cookie.json 已删除
   ✓ 重启服务器需要重新登录
   ```

4. **测试刷新资料**
   ```
   ✓ 点击"刷新资料"
   ✓ 显示"资料刷新成功"提示
   ✓ 用户信息保持登录状态
   ```

## 注意事项

1. **退出是永久的**：退出后必须重新扫码登录
2. **影响范围**：只清除网易云登录，不影响本机用户
3. **Cookie位置**：确认 `server/cookie.json` 被删除
4. **重新登录**：可选择是否勾选"记住我"
