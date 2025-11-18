const fs = require('fs');
const path = require('path');

const CLIENT_COOKIES_FILE = path.join(__dirname, 'client-cookies.json');
const COOKIE_EXPIRE_DAYS = 7; // Cookie有效期：7天

// 客户端登录管理器 - 为每个IP存储独立的网易云Cookie
class ClientAuthManager {
  constructor() {
    this.clientCookies = this.loadClientCookies();
  }

  // 加载所有客户端的Cookie数据
  loadClientCookies() {
    try {
      if (fs.existsSync(CLIENT_COOKIES_FILE)) {
        const data = fs.readFileSync(CLIENT_COOKIES_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载客户端Cookie数据失败:', error);
    }
    return {};
  }

  // 保存所有客户端的Cookie数据
  saveClientCookies() {
    try {
      fs.writeFileSync(CLIENT_COOKIES_FILE, JSON.stringify(this.clientCookies, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('保存客户端Cookie数据失败:', error);
      return false;
    }
  }

  // 获取指定IP的Cookie
  getClientCookie(ip) {
    const data = this.clientCookies[ip];
    if (!data) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > data.expiresAt) {
      console.log(`✗ IP ${ip} 的Cookie已过期`);
      delete this.clientCookies[ip];
      this.saveClientCookies();
      return null;
    }

    return data.cookie;
  }

  // 设置指定IP的Cookie
  setClientCookie(ip, cookie, rememberMe = false) {
    const expiresAt = rememberMe 
      ? Date.now() + COOKIE_EXPIRE_DAYS * 24 * 60 * 60 * 1000 
      : Date.now() + 24 * 60 * 60 * 1000; // 不记住我则24小时过期

    this.clientCookies[ip] = {
      cookie,
      expiresAt,
      savedAt: new Date().toISOString(),
      rememberMe
    };

    if (this.saveClientCookies()) {
      console.log(`✓ 已保存 IP ${ip} 的登录Cookie${rememberMe ? '（记住我）' : ''}`);
      return { success: true };
    } else {
      return { success: false, error: '保存Cookie失败' };
    }
  }

  // 删除指定IP的Cookie
  removeClientCookie(ip) {
    if (this.clientCookies[ip]) {
      delete this.clientCookies[ip];
      this.saveClientCookies();
      console.log(`✓ 已删除 IP ${ip} 的登录Cookie`);
      return { success: true };
    }
    return { success: false, error: '该IP没有保存的Cookie' };
  }

  // 检查指定IP是否已登录
  isClientLoggedIn(ip) {
    return !!this.getClientCookie(ip);
  }

  // 清理所有过期的Cookie（可定期调用）
  cleanupExpiredCookies() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [ip, data] of Object.entries(this.clientCookies)) {
      if (now > data.expiresAt) {
        delete this.clientCookies[ip];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveClientCookies();
      console.log(`✓ 清理了 ${cleanedCount} 个过期的客户端Cookie`);
    }

    return cleanedCount;
  }

  // 获取所有已登录的客户端信息（用于管理）
  getAllLoggedInClients() {
    const now = Date.now();
    const clients = [];

    for (const [ip, data] of Object.entries(this.clientCookies)) {
      if (now <= data.expiresAt) {
        clients.push({
          ip,
          savedAt: data.savedAt,
          expiresAt: new Date(data.expiresAt).toISOString(),
          rememberMe: data.rememberMe
        });
      }
    }

    return clients;
  }
}

module.exports = new ClientAuthManager();
