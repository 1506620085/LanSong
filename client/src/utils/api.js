import axios from 'axios'

const isDev = import.meta.env.DEV
const baseURL = isDev ? 'http://localhost:3000' : ''

const api = axios.create({
  baseURL,
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// API 方法
export default {
  // 暴露底层以便扩展（谨慎使用）
  _raw: api,

  // 获取状态
  getStatus() {
    return api.get('/api/status')
  },

  // 搜索歌曲
  searchSongs(keyword, limit = 30, offset = 0) {
    return api.get('/api/search', { params: { keyword, limit, offset } })
  },

  // 获取歌曲播放URL
  getSongUrl(id) {
    return api.get(`/api/song/url/${id}`)
  },

  // 获取歌曲详情
  getSongDetail(id) {
    return api.get(`/api/song/detail/${id}`)
  },

  // 获取歌词
  getLyric(id) {
    return api.get(`/api/lyric/${id}`)
  },

  // 获取播放队列
  getQueue() {
    return api.get('/api/queue')
  },

  // 添加歌曲到队列
  addToQueue(song) {
    return api.post('/api/queue/add', song)
  },

  // 删除队列中的歌曲
  removeSong(queueId) {
    return api.delete(`/api/queue/${queueId}`)
  },

  // 播放下一首
  playNext() {
    return api.post('/api/queue/next')
  },

  // 播放上一首
  playPrevious() {
    return api.post('/api/queue/previous')
  },

  // 清空队列
  clearQueue() {
    return api.post('/api/queue/clear')
  },

  // 移动歌曲位置
  moveSong(fromIndex, toIndex) {
    return api.post('/api/queue/move', { fromIndex, toIndex })
  },

  // 顶置歌曲
  promoteSong(queueId) {
    return api.post('/api/queue/promote', { queueId })
  },

  // 认证相关
  getAuthStatus() {
    return api.get('/api/auth/status')
  },
  createAuthQr() {
    return api.get('/api/auth/qr/new')
  },
  checkAuthQr(key, rememberMe = false) {
    return api.get('/api/auth/qr/status', { params: { key, rememberMe } })
  },
  logout() {
    return api.post('/api/auth/logout')
  },

  // 用户管理相关
  getUserInfo() {
    return api.get('/api/user/info')
  },
  setUsername(username) {
    return api.post('/api/user/setname', { username })
  },
  getAllUsers() {
    return api.get('/api/user/all')
  },

  // 管理相关
  checkAdminPermission() {
    return api.get('/api/admin/check')
  },
  getAdminConfig() {
    return api.get('/api/admin/config')
  },
}

