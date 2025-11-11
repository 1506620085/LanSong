<template>
  <div class="request-page">
    <div class="container">
      <!-- 头部 -->
      <div class="header">
        <h1 class="title">
          <el-icon><Headset /></el-icon>
          局域网点歌系统
        </h1>
        <p class="subtitle">搜索你喜欢的歌曲，添加到播放队列</p>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="输入歌曲名称或歌手名"
          size="large"
          clearable
          @keyup.enter="handleSearch(1)"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button 
              :icon="Search" 
              @click="handleSearch(1)"
              :loading="searching"
            >
              搜索
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 当前播放 -->
      <div v-if="currentSong" class="current-playing">
        <div class="section-title">
          <el-icon><CaretRight /></el-icon>
          正在播放
        </div>
        <div class="current-song-card">
          <img :src="currentSong.albumPic + '?param=80y80'" class="album-cover" />
          <div class="song-info">
            <div class="song-name">{{ currentSong.name }}</div>
            <div class="song-artist">{{ currentSong.artists }}</div>
          </div>
          <div class="playing-animation">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
        </div>
      </div>

      <!-- 播放队列 -->
      <div v-if="queue.length > 0" class="queue-section">
        <div class="section-title">
          <el-icon><List /></el-icon>
          播放队列 ({{ queue.length }})
        </div>
        <div class="queue-list">
          <div v-for="song in queue" :key="song.queueId" class="queue-item">
            <img :src="song.albumPic + '?param=50y50'" class="queue-album" />
            <div class="queue-info">
              <div class="queue-name">
                {{ song.name }}
                <el-tag v-if="currentSong && currentSong.id === song.id" type="success" size="small" class="playing-tag">
                  正在播放中
                </el-tag>
              </div>
              <div class="queue-artist">{{ song.artists }}</div>
              <div v-if="song.requestedBy" class="queue-requester">
                <el-icon><User /></el-icon>
                {{ song.requestedBy }}
              </div>
            </div>
            <div class="queue-duration">{{ formatDuration(song.duration) }}</div>
            <div v-if="song.promotedBy" class="promoted-info">
              <el-icon class="promoted-icon"><Top /></el-icon>
              <span class="promoted-time">{{ formatRelativeTime(song.promotedAt) }}</span>
              <span>{{ song.promotedBy }}</span>
            </div>
            <el-button
              v-if="!currentSong || currentSong.id !== song.id"
              :icon="Top"
              circle
              size="small"
              type="primary"
              @click="handlePromote(song)"
              title="顶置为下一首"
            />
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchResults.length > 0" class="search-results">
        <div class="section-title">
          <el-icon><Search /></el-icon>
          搜索结果 ({{ searchTotal > 0 ? `共 ${searchTotal} 首` : searchResults.length }})
        </div>
        <div class="results-list">
          <div 
            v-for="song in searchResults" 
            :key="song.id" 
            class="result-item"
          >
            <img :src="song.albumPic + '?param=60y60'" class="result-album" />
            <div class="result-info">
              <div class="result-name">{{ song.name }}</div>
              <div class="result-artist">{{ song.artists }}</div>
              <div class="result-album-name">{{ song.album }}</div>
            </div>
            <div class="result-duration">{{ formatDuration(song.duration) }}</div>
            <el-button 
              type="primary" 
              :icon="Plus"
              @click="handleAddSong(song)"
              :loading="addingIds.includes(song.id)"
            >
              点歌
            </el-button>
          </div>
        </div>
        <!-- 分页组件 -->
        <div class="pagination-wrapper" v-if="searchTotal > pageSize">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :total="searchTotal"
            layout="prev, pager, next, jumper"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!currentSong && queue.length === 0 && searchResults.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Search /></el-icon>
        <p class="empty-text">搜索歌曲开始点歌吧！</p>
      </div>
    </div>
    
    <!-- 底部歌词栏 -->
    <LyricBar
      :current-song="currentSong"
      :current-time="currentTime"
      :is-playing="isPlaying"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus, Headset, CaretRight, List, Top, User } from '@element-plus/icons-vue'
import api from '../utils/api'
import socket from '../utils/socket'
import { formatDuration } from '../utils/format'
import LyricBar from '../components/LyricBar.vue'

const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const searchTotal = ref(0)
const currentPage = ref(1)
const pageSize = ref(30)
const addingIds = ref([])
const currentSong = ref(null)
const queue = ref([])
const currentTime = ref(0)
const isPlaying = ref(false)

// 格式化相对时间
const formatRelativeTime = (timeStr) => {
  if (!timeStr) return ''
  const now = new Date()
  const time = new Date(timeStr)
  const diff = Math.floor((now - time) / 1000) // 秒
  
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
  return time.toLocaleDateString('zh-CN')
}

// 本机用户信息（从 NavBar 同步）
const localUserInfo = ref({
  hasUsername: false
})

// 顶置歌曲
const handlePromote = async (song) => {
  try {
    const result = await api.promoteSong(song.queueId)
    if (result.success) {
      ElMessage.success(`已顶置「${song.name}」`)
    } else {
      ElMessage.error(result.error || '顶置失败')
    }
  } catch (error) {
    ElMessage.error('顶置失败，请检查网络连接')
  }
}

// 搜索歌曲
const handleSearch = async (page = 1) => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  currentPage.value = page
  const offset = (page - 1) * pageSize.value
  
  try {
    const result = await api.searchSongs(searchKeyword.value, pageSize.value, offset)
    if (result.success) {
      searchResults.value = result.data || []
      searchTotal.value = result.total || 0
      if (result.data.length === 0) {
        ElMessage.info('未找到相关歌曲')
      }
      // 滚动到搜索结果顶部
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      ElMessage.error(result.error || '搜索失败')
    }
  } catch (error) {
    ElMessage.error('搜索失败，请检查网络连接')
  } finally {
    searching.value = false
  }
}

// 翻页处理
const handlePageChange = (page) => {
  handleSearch(page)
}

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const result = await api.getUserInfo()
    if (result.success) {
      localUserInfo.value = result.data
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 监听 NavBar 的用户更新事件
const handleLocalUserUpdate = (event) => {
  localUserInfo.value = event.detail
}

// 添加歌曲到队列
const handleAddSong = async (song) => {
  // 检查是否已设置用户名
  if (!localUserInfo.value.hasUsername) {
    ElMessage.warning('请在顶部导航栏设置用户名后再点歌')
    return
  }

  addingIds.value.push(song.id)
  try {
    const result = await api.addToQueue(song)
    if (result.success) {
      ElMessage.success(`已添加「${song.name}」到播放队列`)
    } else if (result.needSetUsername) {
      ElMessage.warning(result.error || '请先设置用户名')
    } else if (result.quotaExceeded) {
      // 限额超限提示
      const minutes = Math.floor(result.timeWindow / 60)
      const seconds = result.timeWindow % 60
      const timeText = minutes > 0 
        ? (seconds > 0 ? `${minutes}分${seconds}秒` : `${minutes}分钟`)
        : `${seconds}秒`
      
      ElMessage({
        message: `点歌太频繁！当前限制：${timeText}内最多${result.max}首歌\n请等待 ${result.waitTime} 秒后再试`,
        type: 'warning',
        duration: 5000,
        dangerouslyUseHTMLString: false
      })
    } else {
      ElMessage.error(result.error || '添加失败')
    }
  } catch (error) {
    ElMessage.error('添加失败，请检查网络连接')
  } finally {
    addingIds.value = addingIds.value.filter(id => id !== song.id)
  }
}

// 更新队列状态
const updateQueue = (state) => {
  currentSong.value = state.currentSong
  queue.value = state.queue || []
}

// 初始化
onMounted(async () => {
  // 获取用户信息
  await fetchUserInfo()
  
  // 监听 NavBar 的用户更新
  window.addEventListener('local-user-updated', handleLocalUserUpdate)

  // 连接 WebSocket
  socket.connect()
  socket.on('queue-updated', updateQueue)
  socket.on('play-next', (data) => {
    currentSong.value = data.currentSong
    queue.value = data.queue || []
  })
  socket.on('play-previous', (data) => {
    currentSong.value = data.currentSong
    queue.value = data.queue || []
  })
  socket.on('player-status', (data) => {
    // 同步播放器状态
    if (data.currentSong) {
      currentSong.value = data.currentSong
    }
    currentTime.value = data.currentTime || 0
    isPlaying.value = data.isPlaying || false
  })

  // 获取初始状态
  try {
    const result = await api.getQueue()
    if (result.success) {
      updateQueue(result.data)
    }
  } catch (error) {
    console.error('获取队列失败:', error)
  }
})

// 清理
onUnmounted(() => {
  window.removeEventListener('local-user-updated', handleLocalUserUpdate)
  socket.off('queue-updated')
  socket.off('play-next')
  socket.off('play-previous')
  socket.off('player-status')
})
</script>

<style scoped>
.request-page {
  min-height: 100vh;
  padding: 20px;
  padding-bottom: 120px; /* 为歌词栏预留空间 */
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.title {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
}

.search-box {
  margin-bottom: 30px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  margin-bottom: 15px;
}

.current-playing {
  margin-bottom: 30px;
}

.current-song-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.album-cover {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}

.song-info {
  flex: 1;
}

.song-name {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

.song-artist {
  font-size: 14px;
  color: #666;
}

.playing-animation {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 30px;
}

.bar {
  width: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  animation: bounce 1s infinite ease-in-out;
}

.bar:nth-child(1) { animation-delay: 0s; }
.bar:nth-child(2) { animation-delay: 0.2s; }
.bar:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 100% { height: 10px; }
  50% { height: 30px; }
}

.queue-section {
  margin-bottom: 30px;
}

.queue-list {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.queue-item:last-child {
  border-bottom: none;
}

.queue-album {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
}

.queue-info {
  flex: 1;
  min-width: 0;
}

.queue-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.playing-tag {
  flex-shrink: 0;
}

.queue-artist {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-requester {
  font-size: 12px;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.queue-duration {
  font-size: 13px;
  color: #999;
}

.promoted-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(64, 158, 255, 0.2);
  white-space: nowrap;
  margin-right: 8px;
}

.promoted-icon {
  font-size: 11px;
}

.promoted-time {
  font-size: 11px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.search-results {
  margin-bottom: 30px;
}

.results-list {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.result-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.result-item:last-child {
  border-bottom: none;
}

.result-album {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-artist {
  font-size: 13px;
  color: #666;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-album-name {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-duration {
  font-size: 14px;
  color: #999;
  margin-right: 10px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: white;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 18px;
  opacity: 0.8;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  margin-top: 20px;
}

/* 美化分页组件样式 */
.pagination-wrapper :deep(.el-pagination) {
  --el-pagination-button-width: 40px;
  --el-pagination-button-height: 40px;
  --el-pagination-button-radius: 8px;
  --el-pagination-bg-color: rgba(255, 255, 255, 0.95);
  --el-pagination-text-color: #333;
  --el-pagination-border-radius: 8px;
}

.pagination-wrapper :deep(.el-pagination .btn-prev),
.pagination-wrapper :deep(.el-pagination .btn-next) {
  margin: 0 8px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pagination-wrapper :deep(.el-pagination .btn-prev:hover),
.pagination-wrapper :deep(.el-pagination .btn-next:hover) {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
}

.pagination-wrapper :deep(.el-pagination .btn-prev:disabled),
.pagination-wrapper :deep(.el-pagination .btn-next:disabled) {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.05);
  opacity: 0.5;
}

.pagination-wrapper :deep(.el-pagination .el-pager li) {
  margin: 0 4px;
  min-width: 40px;
  height: 40px;
  line-height: 40px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pagination-wrapper :deep(.el-pagination .el-pager li:hover) {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.pagination-wrapper :deep(.el-pagination .el-pager li.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.pagination-wrapper :deep(.el-pagination .el-pagination__jump) {
  margin-left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}

/* "Go to" 文字样式 - 加粗白色 */
.pagination-wrapper :deep(.el-pagination .el-pagination__jump > span:first-child),
.pagination-wrapper :deep(.el-pagination .el-pagination__jump span) {
  color: white !important;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.pagination-wrapper :deep(.el-pagination .el-pagination__jump .el-input) {
  width: 60px;
}

.pagination-wrapper :deep(.el-pagination .el-pagination__jump .el-input__wrapper) {
  background: transparent;
  border-radius: 8px;
  box-shadow: none;
  padding: 0;
  border: none;
}

.pagination-wrapper :deep(.el-pagination .el-pagination__jump .el-input__inner) {
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.95);
  transition: all 0.3s;
  padding: 0 12px;
}

.pagination-wrapper :deep(.el-pagination .el-pagination__jump .el-input__inner:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

@media (max-width: 768px) {
  .pagination-wrapper :deep(.el-pagination .el-pager li) {
    margin: 0 2px;
    min-width: 36px;
    height: 36px;
    line-height: 36px;
    font-size: 14px;
  }
  
  .pagination-wrapper :deep(.el-pagination .btn-prev),
  .pagination-wrapper :deep(.el-pagination .btn-next) {
    width: 36px;
    height: 36px;
    margin: 0 4px;
  }
  
  .pagination-wrapper :deep(.el-pagination .el-pagination__jump) {
    margin-left: 12px;
    font-size: 14px;
  }

  .title {
    font-size: 28px;
  }

  .result-album {
    width: 50px;
    height: 50px;
  }

  .result-name {
    font-size: 15px;
  }

  .result-artist,
  .result-album-name {
    font-size: 12px;
  }
}
</style>

