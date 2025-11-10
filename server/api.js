const fs = require('fs');
const path = require('path');

// 导入网易云音乐API模块的各个方法
const { 
  login_cellphone,
  login_qr_key,
  login_qr_create,
  login_qr_check,
  cloudsearch, 
  song_url, 
  song_detail, 
  lyric 
} = require('NeteaseCloudMusicApi');

class MusicApi {
  constructor() {
    this.cookie = '';
    this.isLoggedIn = false;
  }

  // 手机号密码登录（已废弃，建议使用二维码登录）
  async login(phone, password) {
    try {
      const result = await login_cellphone({
        phone,
        password
      });

      if (result.body.code === 200) {
        this.cookie = result.body.cookie;
        this.isLoggedIn = true;
        console.log('✓ 网易云音乐登录成功');
        return { success: true, data: result.body };
      } else {
        console.error('✗ 登录失败:', result.body.msg);
        return { success: false, error: result.body.msg };
      }
    } catch (error) {
      console.error('✗ 登录异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 二维码登录
  async loginWithQRCode() {
    try {
      console.log('📱 正在生成登录二维码...');
      
      // 1. 获取二维码 key
      const keyResult = await login_qr_key({
        timestamp: Date.now()
      });

      if (keyResult.body.code !== 200) {
        console.error('✗ 获取二维码 key 失败');
        return { success: false, error: '获取二维码 key 失败' };
      }

      const key = keyResult.body.data.unikey;
      
      // 2. 生成二维码
      const qrResult = await login_qr_create({
        key,
        qrimg: true,
        timestamp: Date.now()
      });

      if (qrResult.body.code !== 200) {
        console.error('✗ 生成二维码失败');
        return { success: false, error: '生成二维码失败' };
      }

      const qrUrl = qrResult.body.data.qrurl;
      const qrImg = qrResult.body.data.qrimg;

      return {
        success: true,
        key,
        qrUrl,
        qrImg
      };
    } catch (error) {
      console.error('✗ 二维码登录异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 检查二维码扫码状态
  async checkQRCodeStatus(key) {
    try {
      const result = await login_qr_check({
        key,
        timestamp: Date.now()
      });

      const code = result.body.code;
      
      // 800: 二维码过期
      // 801: 等待扫码
      // 802: 待确认
      // 803: 授权登录成功
      
      if (code === 803) {
        // 登录成功，保存 cookie
        this.cookie = result.body.cookie;
        this.isLoggedIn = true;
        return { 
          success: true, 
          status: 'success',
          message: '登录成功',
          cookie: result.body.cookie
        };
      } else if (code === 800) {
        return { 
          success: false, 
          status: 'expired',
          message: '二维码已过期'
        };
      } else if (code === 802) {
        return { 
          success: false, 
          status: 'scanned',
          message: '已扫码，等待确认'
        };
      } else if (code === 801) {
        return { 
          success: false, 
          status: 'waiting',
          message: '等待扫码'
        };
      } else {
        return { 
          success: false, 
          status: 'unknown',
          message: result.body.message || '未知状态'
        };
      }
    } catch (error) {
      console.error('✗ 检查二维码状态异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 轮询检查二维码状态（直到登录成功或超时）
  async waitForQRCodeLogin(key, timeout = 120000) {
    const startTime = Date.now();
    const checkInterval = 3000; // 每3秒检查一次
    
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        // 检查是否超时
        if (Date.now() - startTime > timeout) {
          clearInterval(timer);
          reject(new Error('二维码登录超时'));
          return;
        }

        // 检查扫码状态
        const status = await this.checkQRCodeStatus(key);
        
        if (status.status === 'success') {
          clearInterval(timer);
          console.log('✓ 二维码登录成功！');
          resolve(status);
        } else if (status.status === 'expired') {
          clearInterval(timer);
          reject(new Error('二维码已过期'));
        } else if (status.status === 'scanned') {
          console.log('📱 已扫码，请在手机上确认登录...');
        } else if (status.status === 'waiting') {
          // 继续等待，不输出日志避免刷屏
        }
      }, checkInterval);
    });
  }

  // 搜索歌曲
  async searchSongs(keyword, limit = 30) {
    try {
      const result = await cloudsearch({
        keywords: keyword,
        limit,
        type: 1, // 1: 单曲
        cookie: this.cookie
      });

      if (result.body.code === 200) {
        const songs = result.body.result.songs || [];
        return {
          success: true,
          data: songs.map(song => ({
            id: song.id,
            name: song.name,
            artists: song.ar.map(ar => ar.name).join(' / '),
            album: song.al.name,
            albumPic: song.al.picUrl,
            duration: song.dt
          }))
        };
      } else {
        return { success: false, error: '搜索失败' };
      }
    } catch (error) {
      console.error('搜索异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 获取歌曲播放URL
  async getSongUrl(id) {
    try {
      const result = await song_url({
        id,
        cookie: this.cookie
      });

      if (result.body.code === 200 && result.body.data.length > 0) {
        const url = result.body.data[0].url;
        return { success: true, url };
      } else {
        return { success: false, error: '获取播放链接失败' };
      }
    } catch (error) {
      console.error('获取播放链接异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 获取歌曲详情
  async getSongDetail(ids) {
    try {
      const result = await song_detail({
        ids: Array.isArray(ids) ? ids.join(',') : ids,
        cookie: this.cookie
      });

      if (result.body.code === 200) {
        const songs = result.body.songs || [];
        return {
          success: true,
          data: songs.map(song => ({
            id: song.id,
            name: song.name,
            artists: song.ar.map(ar => ar.name).join(' / '),
            album: song.al.name,
            albumPic: song.al.picUrl,
            duration: song.dt
          }))
        };
      } else {
        return { success: false, error: '获取歌曲详情失败' };
      }
    } catch (error) {
      console.error('获取歌曲详情异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 获取歌词
  async getLyric(id) {
    try {
      const result = await lyric({
        id,
        cookie: this.cookie
      });

      if (result.body.code === 200) {
        return {
          success: true,
          lyric: result.body.lrc?.lyric || '',
          tlyric: result.body.tlyric?.lyric || ''
        };
      } else {
        return { success: false, error: '获取歌词失败' };
      }
    } catch (error) {
      console.error('获取歌词异常:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MusicApi();

