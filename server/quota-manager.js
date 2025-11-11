// 用户点歌限额管理
class QuotaManager {
  constructor() {
    // 默认配置：1分钟3首
    this.config = {
      timeWindow: 60, // 时间窗口（秒）
      maxSongs: 3     // 最大歌曲数
    };
    
    // 用户点歌历史记录 { ip: [{ time, songId }] }
    this.userRequests = new Map();
  }

  // 获取配置
  getConfig() {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(timeWindow, maxSongs) {
    if (timeWindow && timeWindow > 0) {
      this.config.timeWindow = timeWindow;
    }
    if (maxSongs && maxSongs > 0) {
      this.config.maxSongs = maxSongs;
    }
    console.log(`✓ 限额配置已更新: ${this.config.timeWindow}秒/${this.config.maxSongs}首`);
    return { success: true };
  }

  // 检查用户是否可以点歌
  checkQuota(ip, isHost) {
    // 主机不受限制
    if (isHost) {
      return { allowed: true };
    }

    const now = Date.now();
    const requests = this.userRequests.get(ip) || [];
    
    // 清理过期记录
    const timeWindowMs = this.config.timeWindow * 1000;
    const validRequests = requests.filter(req => now - req.time < timeWindowMs);
    
    // 检查是否超过限额
    if (validRequests.length >= this.config.maxSongs) {
      const oldestRequest = validRequests[0];
      const waitTime = Math.ceil((timeWindowMs - (now - oldestRequest.time)) / 1000);
      
      return {
        allowed: false,
        error: `点歌太频繁了！当前限制：${this.config.timeWindow}秒内最多${this.config.maxSongs}首歌`,
        waitTime: waitTime,
        current: validRequests.length,
        max: this.config.maxSongs,
        timeWindow: this.config.timeWindow
      };
    }
    
    return {
      allowed: true,
      remaining: this.config.maxSongs - validRequests.length,
      timeWindow: this.config.timeWindow
    };
  }

  // 记录用户点歌
  recordRequest(ip, songId) {
    if (!this.userRequests.has(ip)) {
      this.userRequests.set(ip, []);
    }
    
    const requests = this.userRequests.get(ip);
    requests.push({
      time: Date.now(),
      songId: songId
    });
    
    // 保留最近的记录即可
    const timeWindowMs = this.config.timeWindow * 1000;
    const now = Date.now();
    const validRequests = requests.filter(req => now - req.time < timeWindowMs * 2);
    this.userRequests.set(ip, validRequests);
  }

  // 获取用户当前状态
  getUserStatus(ip, isHost) {
    if (isHost) {
      return {
        isHost: true,
        unlimited: true,
        current: 0,
        max: this.config.maxSongs,
        timeWindow: this.config.timeWindow
      };
    }

    const now = Date.now();
    const requests = this.userRequests.get(ip) || [];
    const timeWindowMs = this.config.timeWindow * 1000;
    const validRequests = requests.filter(req => now - req.time < timeWindowMs);
    
    return {
      isHost: false,
      unlimited: false,
      current: validRequests.length,
      max: this.config.maxSongs,
      remaining: Math.max(0, this.config.maxSongs - validRequests.length),
      timeWindow: this.config.timeWindow
    };
  }

  // 清理过期数据（可定期调用）
  cleanup() {
    const now = Date.now();
    const timeWindowMs = this.config.timeWindow * 1000 * 2;
    
    for (const [ip, requests] of this.userRequests.entries()) {
      const validRequests = requests.filter(req => now - req.time < timeWindowMs);
      if (validRequests.length === 0) {
        this.userRequests.delete(ip);
      } else {
        this.userRequests.set(ip, validRequests);
      }
    }
  }
}

// 导出单例
module.exports = new QuotaManager();
