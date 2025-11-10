# 更新说明 - v1.0.1

## 🎉 新功能：二维码登录

为了提供更安全、便捷的登录体验，v1.0.1 版本新增了**二维码登录**功能！

## 📋 更新步骤

### 1. 安装新依赖

```bash
# 进入服务器目录
cd server

# 安装新依赖
npm install
# 或使用 yarn
yarn
```

新增依赖：`qrcode-terminal` - 用于在控制台显示二维码

### 2. 更新配置文件

编辑 `server/config.json`：

**旧配置（v1.0.0）**：
```json
{
  "phone": "你的手机号",
  "password": "你的密码",
  "port": 3000
}
```

**新配置（v1.0.1 推荐）**：
```json
{
  "loginMethod": "qrcode",
  "port": 3000
}
```

### 3. 启动服务

```bash
cd server
node app.js
```

启动后会显示二维码，使用网易云音乐 APP 扫码登录即可！

## ✨ 二维码登录的优势

- ✅ **更安全**：不需要在配置文件中保存密码
- ✅ **不容易被风控**：避免触发网易云的安全检测
- ✅ **使用简单**：扫码即可，无需输入账号密码
- ✅ **支持所有账号**：邮箱、手机号注册的账号都可以

## 🔄 兼容性说明

如果你仍然想使用手机号密码登录（不推荐），可以这样配置：

```json
{
  "loginMethod": "password",
  "phone": "你的手机号",
  "password": "你的密码",
  "port": 3000
}
```

⚠️ 注意：手机号密码登录容易触发风控，建议使用二维码登录。

## 🐛 Bug 修复

- 修复了 `NeteaseCloudMusicApi` 导入问题
- 修复了搜索功能报错 `Cannot read properties of undefined (reading 'cloudsearch')`

## 📖 文档更新

所有文档已更新：
- README.md
- QUICKSTART.md
- GUIDE.md
- FAQ.md

查看 [CHANGELOG.md](CHANGELOG.md) 了解完整更新日志。

## ❓ 常见问题

### Q: 二维码无法显示？

**A:** 控制台会同时显示二维码 URL，复制到浏览器打开，然后扫描。

### Q: 二维码过期了？

**A:** 二维码有效期 2 分钟，过期后重启服务器会生成新的二维码。

### Q: 还有其他问题？

**A:** 查看 [FAQ.md](FAQ.md) 或提交 Issue。

---

祝你使用愉快！🎵

