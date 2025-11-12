// 用户点歌限额管理
class QuotaManager {
  constructor() {
    // 默认配置
    this.config = {
      // 点歌限额：1分钟3首
      song: {
        timeWindow: 60, // 时间窗口（秒）
        maxOperations: 3     // 最大操作数
      },
      // 切歌限额：5分钟2次
      skip: {
        timeWindow: 300, // 时间窗口（秒）
        maxOperations: 2     // 最大操作数
      },
      // 顶置限额：2分钟1次
      promote: {
        timeWindow: 120, // 时间窗口（秒）
        maxOperations: 1     // 最大操作数
      }
    };
    
    // 用户操作历史记录 { ip: { song: [...], skip: [...], promote: [...] } }
    this.userRequests = new Map();
  }

  // 获取配置
  getConfig() {
    return { ...this.config };
  }

  // 更新点歌配置（保持向后兼容）
  updateConfig(timeWindow, maxSongs) {
    if (timeWindow && timeWindow > 0) {
      this.config.song.timeWindow = timeWindow;
    }
    if (maxSongs && maxSongs > 0) {
      this.config.song.maxOperations = maxSongs;
    }
    console.log(`✓ 点歌限额配置已更新: ${this.config.song.timeWindow}秒/${this.config.song.maxOperations}首`);
    return { success: true };
  }

  // 更新操作配置（新方法）
  updateOperationConfig(operationType, timeWindow, maxOperations) {
    if (!this.config[operationType]) {
      return { success: false, error: '无效的操作类型' };
    }
    
    if (timeWindow && timeWindow > 0) {
      this.config[operationType].timeWindow = timeWindow;
    }
    if (maxOperations && maxOperations > 0) {
      this.config[operationType].maxOperations = maxOperations;
    }
    
    const typeNames = {
      song: '点歌',
      skip: '切歌', 
      promote: '顶置'
    };
    
    console.log(`✓ ${typeNames[operationType]}限额配置已更新: ${this.config[operationType].timeWindow}秒/${this.config[operationType].maxOperations}次`);
    return { success: true };
  }

  // 检查用户是否可以点歌（保持向后兼容）
  checkQuota(ip, isHost) {
    return this.checkOperationQuota(ip, 'song', isHost);
  }

  // 检查用户操作限额（通用方法）
  checkOperationQuota(ip, operationType, isHost) {
    // 主机不受限制
    if (isHost) {
      return { allowed: true };
    }

    if (!this.config[operationType]) {
      return { allowed: false, error: '无效的操作类型' };
    }

    const now = Date.now();
    const userRequests = this.userRequests.get(ip) || {};
    const requests = userRequests[operationType] || [];
    
    // 清理过期记录
    const config = this.config[operationType];
    const timeWindowMs = config.timeWindow * 1000;
    const validRequests = requests.filter(req => now - req.time < timeWindowMs);
    
    const typeNames = {
      song: '点歌',
      skip: '切歌',
      promote: '顶置'
    };
    
    const typeName = typeNames[operationType] || operationType;
    
    // 检查是否超过限额
    if (validRequests.length >= config.maxOperations) {
      const oldestRequest = validRequests[0];
      const waitTime = Math.ceil((timeWindowMs - (now - oldestRequest.time)) / 1000);
      
      return {
        allowed: false,
        error: `${typeName}太频繁了！当前限制：${config.timeWindow}秒内最多${config.maxOperations}次`,
        waitTime: waitTime,
        current: validRequests.length,
        max: config.maxOperations,
        timeWindow: config.timeWindow,
        operationType: operationType
      };
    }
    
    return {
      allowed: true,
      remaining: config.maxOperations - validRequests.length,
      timeWindow: config.timeWindow,
      operationType: operationType
    };
  }

  // 记录用户点歌（保持向后兼容）
  recordRequest(ip, songId) {
    this.recordOperation(ip, 'song', { songId });
  }

  // 记录用户操作（通用方法）
  recordOperation(ip, operationType, data = {}) {
    if (!this.userRequests.has(ip)) {
      this.userRequests.set(ip, {});
    }
    
    const userRequests = this.userRequests.get(ip);
    if (!userRequests[operationType]) {
      userRequests[operationType] = [];
    }
    
    const requests = userRequests[operationType];
    requests.push({
      time: Date.now(),
      ...data
    });
    
    // 保留最近的记录即可
    if (this.config[operationType]) {
      const timeWindowMs = this.config[operationType].timeWindow * 1000;
      const now = Date.now();
      const validRequests = requests.filter(req => now - req.time < timeWindowMs * 2);
      userRequests[operationType] = validRequests;
    }
  }

  // 获取用户当前状态（保持向后兼容，返回点歌状态）
  getUserStatus(ip, isHost) {
    return this.getOperationStatus(ip, 'song', isHost);
  }

  // 获取用户操作状态（通用方法）
  getOperationStatus(ip, operationType, isHost) {
    if (isHost) {
      return {
        isHost: true,
        unlimited: true,
        operationType: operationType,
        current: 0,
        max: this.config[operationType]?.maxOperations || 0,
        timeWindow: this.config[operationType]?.timeWindow || 0
      };
    }

    if (!this.config[operationType]) {
      return {
        isHost: false,
        unlimited: false,
        operationType: operationType,
        current: 0,
        max: 0,
        remaining: 0,
        timeWindow: 0
      };
    }

    const now = Date.now();
    const userRequests = this.userRequests.get(ip) || {};
    const requests = userRequests[operationType] || [];
    const config = this.config[operationType];
    const timeWindowMs = config.timeWindow * 1000;
    const validRequests = requests.filter(req => now - req.time < timeWindowMs);
    
    return {
      isHost: false,
      unlimited: false,
      operationType: operationType,
      current: validRequests.length,
      max: config.maxOperations,
      remaining: Math.max(0, config.maxOperations - validRequests.length),
      timeWindow: config.timeWindow
    };
  }

  // 获取所有操作类型的状态
  getAllOperationStatus(ip, isHost) {
    const status = {};
    for (const operationType of Object.keys(this.config)) {
      status[operationType] = this.getOperationStatus(ip, operationType, isHost);
    }
    return status;
  }

  // 清理过期数据（可定期调用）
  cleanup() {
    const now = Date.now();
    
    for (const [ip, userRequests] of this.userRequests.entries()) {
      let hasValidRequests = false;
      
      for (const [operationType, requests] of Object.entries(userRequests)) {
        if (this.config[operationType]) {
          const timeWindowMs = this.config[operationType].timeWindow * 1000 * 2;
          const validRequests = requests.filter(req => now - req.time < timeWindowMs);
          
          if (validRequests.length > 0) {
            userRequests[operationType] = validRequests;
            hasValidRequests = true;
          } else {
            delete userRequests[operationType];
          }
        }
      }
      
      if (!hasValidRequests) {
        this.userRequests.delete(ip);
      }
    }
  }
}

// 导出单例
module.exports = new QuotaManager();
