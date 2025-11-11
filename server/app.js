const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const musicApi = require('./api');
const playQueue = require('./queue');
const ipManager = require('./ip-manager');

// 读取配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（生产环境）
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// 获取客户端真实IP地址
// 获取服务器本机IP地址
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部地址和非 IPv4 地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // 默认返回本地地址
}

const SERVER_IP = getServerIP();
console.log(`🖥️  服务器主机IP: ${SERVER_IP}`);

function getClientIP(req) {
  // 优先从代理头获取
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // 其他代理头
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  // 直连IP
  const ip = req.socket.remoteAddress || req.connection.remoteAddress;
  // 如果是IPv6的IPv4映射地址，提取IPv4部分
  if (ip && ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip || 'unknown';
}

// 判断是否是主机
function isHost(ip) {
  return ip === SERVER_IP || ip === '127.0.0.1' || ip === 'localhost' || ip === '::1';
}

// ============ API 路由 ============

// ============ IP用户管理 API ============

// 获取当前用户信息
app.get('/api/user/info', (req, res) => {
  const ip = getClientIP(req);
  const user = ipManager.getUserByIP(ip);
  res.json({
    success: true,
    data: {
      ip: ip,
      username: user?.username || null,
      hasUsername: !!user?.username,
      isHost: isHost(ip) // 添加主机标识
    }
  });
});

// 设置用户名
app.post('/api/user/setname', (req, res) => {
  const ip = getClientIP(req);
  const { username } = req.body;
  
  if (!username) {
    return res.json({ success: false, error: '用户名不能为空' });
  }
  
  const result = ipManager.setUsername(ip, username);
  res.json(result);
});

// 获取所有用户（可选，用于管理）
app.get('/api/user/all', (req, res) => {
  const users = ipManager.getAllUsers();
  res.json({
    success: true,
    data: users
  });
});

// ============ 管理API ============

// 中间件：验证是否是主机
function requireHost(req, res, next) {
  const ip = getClientIP(req);
  if (!isHost(ip)) {
    return res.status(403).json({
      success: false,
      error: '无权访问，仅主机可以访问管理功能'
    });
  }
  next();
}

// 检查是否是主机
app.get('/api/admin/check', (req, res) => {
  const ip = getClientIP(req);
  res.json({
    success: true,
    isHost: isHost(ip),
    serverIP: SERVER_IP,
    clientIP: ip
  });
});

// 获取管理配置（仅主机）
app.get('/api/admin/config', requireHost, (req, res) => {
  // TODO: 后续添加配置管理
  res.json({
    success: true,
    data: {
      message: '管理配置功能待开发'
    }
  });
});

// 获取顶置历史记录（仅主机）
app.get('/api/admin/promote-history', requireHost, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = playQueue.getPromoteHistory(limit);
  res.json({
    success: true,
    data: history,
    total: history.length
  });
});

// 清除顶置历史记录（仅主机）
app.post('/api/admin/clear-promote-history', requireHost, (req, res) => {
  playQueue.clearPromoteHistory();
  res.json({
    success: true,
    message: '顶置历史已清除'
  });
});

// ============ 认证相关 API ============

// 生成二维码
app.get('/api/auth/qr/new', async (req, res) => {
  try {
    const qrResult = await musicApi.loginWithQRCode();
    res.json(qrResult);
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// 查询二维码状态
app.get('/api/auth/qr/status', async (req, res) => {
  const { key, rememberMe } = req.query;
  if (!key) return res.json({ success: false, error: '缺少 key' });
  const remember = rememberMe === 'true' || rememberMe === true;
  const status = await musicApi.checkQRCodeStatus(key, remember);
  if (status.status === 'success') {
    // 登录成功后，广播登录状态
    io.emit('auth-status', { isLoggedIn: true });
  }
  res.json(status);
});

// 登录状态
app.get('/api/auth/status', async (req, res) => {
  const status = await musicApi.checkLoginStatus();
  let profile = null;
  if (status.success && status.isLoggedIn) {
    const info = await musicApi.getUserInfo();
    if (info.success) profile = info.data;
  }
  res.json({ success: true, isLoggedIn: !!status.isLoggedIn, profile });
});

// 退出登录
app.post('/api/auth/logout', (req, res) => {
  musicApi.logout();
  io.emit('auth-status', { isLoggedIn: false });
  res.json({ success: true });
});

// 登录状态检查
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    isLoggedIn: musicApi.isLoggedIn,
    queueLength: playQueue.getQueue().length
  });
});

// 搜索歌曲
app.get('/api/search', async (req, res) => {
  const { keyword, limit = 30, offset = 0 } = req.query;
  if (!keyword) {
    return res.json({ success: false, error: '请输入搜索关键词' });
  }

  const result = await musicApi.searchSongs(keyword, parseInt(limit), parseInt(offset));
  res.json(result);
});

// 获取歌曲播放URL
app.get('/api/song/url/:id', async (req, res) => {
  const { id } = req.params;
  const result = await musicApi.getSongUrl(id);
  res.json(result);
});

// 获取歌曲详情
app.get('/api/song/detail/:id', async (req, res) => {
  const { id } = req.params;
  const result = await musicApi.getSongDetail(id);
  res.json(result);
});

// 获取歌词
app.get('/api/lyric/:id', async (req, res) => {
  const { id } = req.params;
  const result = await musicApi.getLyric(id);
  res.json(result);
});

// ============ 播放队列 API ============

// 获取播放队列
app.get('/api/queue', (req, res) => {
  res.json({
    success: true,
    data: playQueue.getState()
  });
});

// 添加歌曲到队列
app.post('/api/queue/add', (req, res) => {
  const song = req.body;
  if (!song.id || !song.name) {
    return res.json({ success: false, error: '歌曲信息不完整' });
  }

  // 验证用户是否已设置用户名
  const ip = getClientIP(req);
  if (!ipManager.hasUsername(ip)) {
    return res.json({ 
      success: false, 
      error: '请先设置用户名后再点歌',
      needSetUsername: true 
    });
  }

  // 在歌曲信息中添加点歌用户信息
  const user = ipManager.getUserByIP(ip);
  const songWithUser = {
    ...song,
    requestedBy: user.username,
    requestedIP: ip
  };

  const added = playQueue.addSong(songWithUser);
  
  // 广播队列更新
  io.emit('queue-updated', playQueue.getState());
  
  res.json({ success: true, data: added });
});

// 删除队列中的歌曲
app.delete('/api/queue/:queueId', (req, res) => {
  const { queueId } = req.params;
  const result = playQueue.removeSong(parseFloat(queueId));
  
  // 广播队列更新
  io.emit('queue-updated', playQueue.getState());
  
  res.json(result);
});

// 播放下一首
app.post('/api/queue/next', (req, res) => {
  const nextSong = playQueue.playNext();
  
  // 广播播放状态更新
  io.emit('play-next', {
    currentSong: nextSong,
    queue: playQueue.getQueue()
  });
  
  res.json({ success: true, data: nextSong });
});

// 播放上一首
app.post('/api/queue/previous', (req, res) => {
  const prevSong = playQueue.playPrevious();
  
  // 广播播放状态更新
  io.emit('play-previous', {
    currentSong: prevSong,
    queue: playQueue.getQueue()
  });
  
  res.json({ success: true, data: prevSong });
});

// 清空队列
app.post('/api/queue/clear', (req, res) => {
  playQueue.clear();
  
  // 广播队列更新
  io.emit('queue-updated', playQueue.getState());
  
  res.json({ success: true });
});

// 移动歌曲位置
app.post('/api/queue/move', (req, res) => {
  const { fromIndex, toIndex } = req.body;
  const result = playQueue.moveSong(fromIndex, toIndex);
  
  if (result.success) {
    // 广播队列更新
    io.emit('queue-updated', playQueue.getState());
  }
  
  res.json(result);
});

// 顶置歌曲
app.post('/api/queue/promote', (req, res) => {
  const { queueId } = req.body;
  if (!queueId) {
    return res.json({ success: false, error: '缺少 queueId' });
  }
  
  // 获取顶置用户信息
  const ip = getClientIP(req);
  const user = ipManager.getUserByIP(ip);
  const promotedBy = user?.username || ip;
  
  const result = playQueue.promoteSong(parseFloat(queueId), promotedBy);
  if (result.success) {
    io.emit('queue-updated', playQueue.getState());
  }
  res.json(result);
});

// ============ Socket.IO ============

io.on('connection', (socket) => {
  console.log('✓ 客户端连接:', socket.id);

  // 发送当前状态给新连接的客户端
  socket.emit('queue-updated', playQueue.getState());

  socket.on('disconnect', () => {
    console.log('✗ 客户端断开:', socket.id);
  });

  // 播放器心跳
  socket.on('player-heartbeat', (data) => {
    io.emit('player-status', data);
  });
});

// ============ SPA 路由支持 ============
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('请先构建前端应用：cd client && npm run build');
  }
});

// ============ 启动服务器 ============

async function startServer() {
  console.log('\n========================================')
  console.log('🎵 局域网点歌系统启动中...')
  console.log('========================================\n')
  console.log(`🖥️  主机IP地址: ${SERVER_IP}`);
  console.log(`🔒 管理权限: 仅 ${SERVER_IP} 可以访问管理功能\n`)

  // 尝试加载保存的Cookie
  console.log('🔑 检查保存的登录状态...');
  const loadResult = musicApi.loadCookieFromFile();
  if (loadResult.success) {
    // 验证Cookie是否有效
    const status = await musicApi.checkLoginStatus();
    if (status.isLoggedIn) {
      const userInfo = await musicApi.getUserInfo();
      if (userInfo.success) {
        console.log(`✓ 自动登录成功！欢迎 ${userInfo.data.nickname}`);
        console.log('');
      } else {
        console.log('⚠️  Cookie无效，需要重新登录\n');
      }
    } else {
      console.log('⚠️  Cookie无效，需要重新登录\n');
    }
  } else {
    console.log('ℹ️  未找到保存的登录信息\n');
  }

  // 登录网易云音乐
  const loginMethod = config.loginMethod || 'qrcode';
  
  if (loginMethod === 'qrcode') {
    // 网页端扫码登录：启动时不在控制台输出二维码，前端弹窗完成登录
    console.log('🔐 登录模式：网页端二维码登录（在前端弹窗中完成）\n');
  } else if (loginMethod === 'password' && config.phone && config.password) {
    // 手机号密码登录（不推荐，容易被风控）
    console.log('📱 正在使用手机号密码登录...');
    console.log('⚠️  建议使用二维码登录，更安全便捷\n');
    const loginResult = await musicApi.login(config.phone, config.password);
    if (!loginResult.success) {
      console.error('⚠️  登录失败，部分功能可能受限');
      console.error('   建议使用二维码登录\n');
    }
  } else {
    console.log('⚠️  未配置登录方式');
    console.log('   请在 config.json 中设置 "loginMethod": "qrcode"');
    console.log('   部分功能可能受限\n');
  }

  const PORT = config.port || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('✓ 服务器启动成功！');
    console.log('========================================');
    console.log(`\n📍 本地访问地址: http://localhost:${PORT}`);
    
    // 获取局域网IP
    const os = require('os');
    const interfaces = os.networkInterfaces();
    console.log('\n📱 局域网访问地址:');
    for (let name of Object.keys(interfaces)) {
      for (let iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`   http://${iface.address}:${PORT}`);
        }
      }
    }
    
    console.log('\n🎮 使用说明:');
    console.log(`   - 点歌页面: http://localhost:${PORT}/`);
    console.log(`   - 主控播放器: http://localhost:${PORT}/player`);
    console.log('\n========================================\n');
  });
}

startServer().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});

