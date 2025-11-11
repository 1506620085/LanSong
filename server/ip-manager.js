const fs = require('fs');
const path = require('path');

const IP_USERS_FILE = path.join(__dirname, 'ip-users.json');

// IP用户管理器
class IPUserManager {
  constructor() {
    this.users = this.loadUsers();
  }

  // 加载用户数据
  loadUsers() {
    try {
      if (fs.existsSync(IP_USERS_FILE)) {
        const data = fs.readFileSync(IP_USERS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载IP用户数据失败:', error);
    }
    return {};
  }

  // 保存用户数据
  saveUsers() {
    try {
      fs.writeFileSync(IP_USERS_FILE, JSON.stringify(this.users, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存IP用户数据失败:', error);
      throw error;
    }
  }

  // 获取用户信息
  getUserByIP(ip) {
    return this.users[ip] || null;
  }

  // 设置用户名
  setUsername(ip, username) {
    if (!username || username.trim().length === 0) {
      return { success: false, error: '用户名不能为空' };
    }

    const trimmedName = username.trim();
    
    // 检查用户名长度
    if (trimmedName.length > 20) {
      return { success: false, error: '用户名不能超过20个字符' };
    }

    // 检查用户名是否已被其他IP使用
    for (const [existingIP, user] of Object.entries(this.users)) {
      if (existingIP !== ip && user.username === trimmedName) {
        return { success: false, error: '该用户名已被使用' };
      }
    }

    this.users[ip] = {
      username: trimmedName,
      ip: ip,
      lastUpdated: new Date().toISOString()
    };

    try {
      this.saveUsers();
      return { success: true, data: this.users[ip] };
    } catch (error) {
      return { success: false, error: '保存用户信息失败' };
    }
  }

  // 检查IP是否已设置用户名
  hasUsername(ip) {
    return !!this.users[ip]?.username;
  }

  // 获取所有用户
  getAllUsers() {
    return this.users;
  }

  // 删除用户
  removeUser(ip) {
    if (this.users[ip]) {
      delete this.users[ip];
      this.saveUsers();
      return { success: true };
    }
    return { success: false, error: '用户不存在' };
  }
}

module.exports = new IPUserManager();
