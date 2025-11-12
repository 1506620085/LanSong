<template>
  <div class="player-page">
    <div class="player-container">
      <!-- 头部控制栏 -->
      <div class="header-bar">
        <h1 class="player-title">
          <el-icon><Headset /></el-icon>
          主控播放器
        </h1>
        <div class="header-actions">
          <el-button
            :icon="RefreshRight"
            circle
            @click="loadQueue"
            title="刷新队列"
          />
        </div>
      </div>

      <!-- 主播放器 -->
      <div class="main-player">
        <div v-if="currentSong" class="player-content">
          <!-- 专辑封面 -->
          <div class="album-cover-wrapper">
            <img
              :src="currentSong.albumPic + '?param=300y300'"
              class="album-cover"
              :class="{ rotating: isPlaying }"
            />
            <div class="cover-shadow"></div>
          </div>

          <!-- 歌曲信息 -->
          <div class="song-details">
            <h2 class="current-song-name">{{ currentSong.name }}</h2>
            <p class="current-song-artist">{{ currentSong.artists }}</p>
            <p class="current-song-album">{{ currentSong.album }}</p>
          </div>

          <!-- 进度条 -->
          <div class="progress-section">
            <span class="time-label">{{ formatDuration(currentTime * 1000) }}</span>
            <el-slider
              v-model="currentTime"
              :max="duration"
              :show-tooltip="false"
              @change="handleSeek"
              class="progress-slider"
            />
            <span class="time-label">{{ formatDuration(duration * 1000) }}</span>
          </div>

          <!-- 播放控制 -->
          <div class="controls">
            <el-button
              :icon="DArrowLeft"
              circle
              size="large"
              @click="playPrevious"
              :disabled="!hasPrevious"
            />
            <el-button
              :icon="isPlaying ? VideoPause : VideoPlay"
              circle
              size="large"
              type="primary"
              @click="togglePlay"
              class="play-button"
            />
            <el-button
              :icon="DArrowRight"
              circle
              size="large"
              @click="playNext"
              :disabled="queue.length === 0"
            />
          </div>

          <!-- 音量控制 -->
          <div class="volume-control">
            <el-icon><Microphone /></el-icon>
            <el-slider
              v-model="volume"
              :max="100"
              :show-tooltip="false"
              @input="handleVolumeChange"
              class="volume-slider"
            />
            <span class="volume-label">{{ volume }}%</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-player">
          <el-icon class="empty-icon"><Headset /></el-icon>
          <p class="empty-text">等待歌曲加入队列...</p>
          <p class="empty-hint">请在其他设备上访问点歌页面添加歌曲</p>
        </div>
      </div>

      <!-- 播放队列 -->
      <div class="queue-panel">
        <div class="queue-header">
          <div class="queue-title">
            <el-icon><List /></el-icon>
            播放队列 ({{ queue.length }})
          </div>
          <el-button
            v-if="queue.length > 0"
            :icon="Delete"
            size="small"
            @click="clearQueue"
          >
            清空
          </el-button>
        </div>

        <div class="queue-list" v-if="queue.length > 0">
          <div
            v-for="(song, index) in queue"
            :key="song.queueId"
            class="queue-item"
          >
            <div class="queue-index">{{ index + 1 }}</div>
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
            <div class="queue-actions">
              <el-button
                v-if="!currentSong || currentSong.id !== song.id"
                :icon="Top"
                circle
                size="small"
                type="primary"
                @click="promoteSong(song)"
                title="顶置为下一首"
              />
              <el-button
                :icon="Delete"
                circle
                size="small"
                @click="removeSong(song.queueId)"
              />
            </div>
          </div>
        </div>

        <div v-else class="queue-empty">
          <el-icon><List /></el-icon>
          <p>队列为空</p>
        </div>
      </div>

      <!-- 隐藏的音频元素 -->
      <audio
        ref="audioRef"
        @timeupdate="handleTimeUpdate"
        @ended="handleSongEnd"
        @loadedmetadata="handleLoadedMetadata"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @error="handleError"
      />
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Headset, VideoPlay, VideoPause, DArrowLeft, DArrowRight,
  List, Delete, Microphone, RefreshRight, Top, User
} from '@element-plus/icons-vue'
import api from '../utils/api'
import socket from '../utils/socket'
import { formatDuration } from '../utils/format'
import { authState, fetchAuthStatus } from '../utils/auth'
import LyricBar from '../components/LyricBar.vue'

const audioRef = ref(null)
const currentSong = ref(null)
const queue = ref([])
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)
const hasPrevious = ref(false)

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

// 顶置歌曲
const promoteSong = async (song) => {
  try {
    const result = await api.promoteSong(song.queueId)
    if (result.success) {
      ElMessage.success(`已顶置「${song.name}」`)
    } else {
      ElMessage.error(result.error || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败，请稍后再试')
  }
}

// 加载队列
const loadQueue = async () => {
  try {
    const result = await api.getQueue()
    if (result.success) {
      const wasEmpty = !currentSong.value && queue.value.length === 0
      
      currentSong.value = result.data.currentSong
      queue.value = result.data.queue || []
      hasPrevious.value = result.data.historyLength > 0
      
      // 如果之前是空的，现在有歌曲且没有当前播放歌曲，自动播放第一首
      if (wasEmpty && !result.data.currentSong && result.data.queue && result.data.queue.length > 0) {
        console.log('初始加载自动播放：队列有歌曲但没有当前播放')
        playNext()
      }
    }
  } catch (error) {
    console.error('加载队列失败:', error)
  }
}

// 播放歌曲
const playSong = async (song) => {
  if (!song) return

  try {
    const result = await api.getSongUrl(song.id)
    if (result.success && result.url) {
      audioRef.value.src = result.url
      audioRef.value.load()
      
      // 尝试播放，处理可能的播放失败
      try {
        await audioRef.value.play()
        currentSong.value = song
        isPlaying.value = true
        ElMessage.success(`正在播放: ${song.name}`)
      } catch (playError) {
        console.error('播放失败:', playError)
        ElMessage.error('播放失败，可能需要用户交互后才能播放')
        // 设置歌曲但不自动播放，等待用户手动点击
        currentSong.value = song
        isPlaying.value = false
      }
    } else {
      ElMessage.error('获取播放链接失败')
      // 自动跳到下一首
      setTimeout(() => playNext(), 1000)
    }
  } catch (error) {
    console.error('获取播放链接失败:', error)
    ElMessage.error('播放失败')
    setTimeout(() => playNext(), 1000)
  }
}

// 完全停止播放
const stopPlayback = () => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
    audioRef.value.src = ''
    // 移除所有事件监听器，确保不会有残留的播放事件
    audioRef.value.removeAttribute('src')
    audioRef.value.load()
  }
  currentSong.value = null
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
  console.log('播放已完全停止')
}

// 切换播放/暂停
const togglePlay = async () => {
  if (!audioRef.value || !currentSong.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    try {
      await audioRef.value.play()
    } catch (error) {
      console.error('播放失败:', error)
      ElMessage.error('播放失败，请检查音频文件')
    }
  }
}

// 播放下一首
const playNext = async () => {
  try {
    const result = await api.playNext()
    if (result.success) {
      if (result.message) {
        ElMessage.success(result.message)
      }
      if (result.data) {
        await playSong(result.data)
      } else {
        // 队列已结束，完全停止播放
        ElMessage.info('播放列表已结束')
        stopPlayback()
      }
    } else {
      if (result.needSetUsername) {
        ElMessage.error('请先设置用户名后再进行切歌操作')
      } else if (result.quotaExceeded) {
        ElMessage.error(result.error)
      } else {
        ElMessage.error(result.error || '切歌失败')
      }
    }
  } catch (error) {
    console.error('切歌失败:', error)
    ElMessage.error('切歌失败')
  }
}

// 播放上一首
const playPrevious = async () => {
  try {
    const result = await api.playPrevious()
    if (result.success) {
      if (result.message) {
        ElMessage.success(result.message)
      }
      if (result.data) {
        await playSong(result.data)
      } else {
        ElMessage.error('没有上一首歌曲')
      }
    } else {
      if (result.needSetUsername) {
        ElMessage.error('请先设置用户名后再进行切歌操作')
      } else if (result.quotaExceeded) {
        ElMessage.error(result.error)
      } else {
        ElMessage.error(result.error || '返回上一首失败')
      }
    }
  } catch (error) {
    console.error('返回上一首失败:', error)
    ElMessage.error('返回上一首失败')
  }
}


// 删除歌曲
const removeSong = async (queueId) => {
  try {
    const result = await api.removeSong(queueId)
    if (result.success) {
      ElMessage.success('已删除')
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

// 清空队列
const clearQueue = () => {
  ElMessageBox.confirm('确定要清空播放队列吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await api.clearQueue()
      ElMessage.success('队列已清空')
    } catch (error) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

// 进度条拖动
const handleSeek = (value) => {
  if (audioRef.value) {
    audioRef.value.currentTime = value
  }
}

// 音量调节
const handleVolumeChange = (value) => {
  if (audioRef.value) {
    audioRef.value.volume = value / 100
  }
}

// 时间更新
const handleTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

// 歌曲结束
const handleSongEnd = () => {
  playNext()
}

// 元数据加载
const handleLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
    
    // 如果当前有歌曲但没有播放，尝试自动播放
    if (currentSong.value && !isPlaying.value) {
      console.log('音频元数据加载完成，尝试自动播放')
      audioRef.value.play().catch(error => {
        console.log('自动播放被阻止，等待用户交互:', error)
      })
    }
  }
}

// 播放错误
const handleError = (e) => {
  console.error('播放错误:', e)
  ElMessage.error('播放出错，正在尝试下一首...')
  setTimeout(() => playNext(), 2000)
}

// WebSocket 事件处理
const handleQueueUpdate = (state) => {
  const oldCurrentSong = currentSong.value
  const oldQueueLength = queue.value.length
  
  queue.value = state.queue || []
  hasPrevious.value = state.historyLength > 0
  
  // 更新当前歌曲
  if (state.currentSong) {
    currentSong.value = state.currentSong
  } else if (!state.currentSong && state.queue && state.queue.length === 0) {
    // 队列为空且没有当前歌曲，完全停止播放
    console.log('队列更新：队列为空，停止播放')
    stopPlayback()
    return
  }

  // 自动播放逻辑：
  // 1. 之前没有歌曲正在播放
  // 2. 现在有歌曲在队列中
  // 3. 队列从空变为有歌曲（新添加了歌曲）
  const shouldAutoPlay = (
    !oldCurrentSong && // 之前没有当前歌曲
    !isPlaying.value && // 当前没有播放
    state.queue && 
    state.queue.length > 0 && // 现在队列有歌曲
    oldQueueLength === 0 // 之前队列是空的
  )
  
  if (shouldAutoPlay) {
    console.log('自动播放触发：队列从空变为有歌曲')
    playNext()
  }
}

const handlePlayNext = (data) => {
  queue.value = data.queue || []
  if (data.currentSong) {
    playSong(data.currentSong)
  } else {
    // 没有歌曲时完全停止播放
    stopPlayback()
  }
}

const handlePlayPrevious = (data) => {
  queue.value = data.queue || []
  if (data.currentSong) {
    playSong(data.currentSong)
  }
}

// 监听当前歌曲变化
watch(currentSong, (newSong, oldSong) => {
  if (newSong) {
    // 更新浏览器标题
    document.title = `${newSong.name} - ${newSong.artists}`
    
    // 如果歌曲变化了且之前没有歌曲，尝试自动播放
    if (!oldSong && !isPlaying.value && audioRef.value && audioRef.value.src) {
      console.log('歌曲变化触发自动播放检查')
      setTimeout(() => {
        if (!isPlaying.value && audioRef.value && audioRef.value.src) {
          audioRef.value.play().catch(error => {
            console.log('自动播放被阻止，等待用户交互:', error)
          })
        }
      }, 500) // 延迟500ms确保音频已加载
    }
  } else {
    document.title = '播放器 - 局域网点歌系统'
  }
})

// 发送播放器状态心跳
let heartbeatTimer = null

function sendPlayerHeartbeat() {
  socket.emit('player-heartbeat', {
    currentSong: currentSong.value,
    currentTime: currentTime.value,
    isPlaying: isPlaying.value,
    timestamp: Date.now()
  })
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    sendPlayerHeartbeat()
  }, 1000) // 每秒发送一次
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// 初始化
onMounted(() => {
  // 检查登录状态，未登录则 1s 后自动弹出
  fetchAuthStatus().then(() => {
    if (!authState.isLoggedIn) {
      // 通过事件通知 App.vue 打开登录弹窗
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-login-dialog'))
      }, 1000)
    }
  })

  // 设置初始音量
  if (audioRef.value) {
    audioRef.value.volume = volume.value / 100
  }

  // 连接 WebSocket
  socket.connect()
  socket.on('queue-updated', handleQueueUpdate)
  socket.on('play-next', handlePlayNext)
  socket.on('play-previous', handlePlayPrevious)

  // 加载初始队列
  loadQueue()
  
  // 启动心跳
  startHeartbeat()
})

// 清理
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
  socket.off('queue-updated')
  socket.off('play-next')
  socket.off('play-previous')
  
  // 停止心跳
  stopHeartbeat()
})
</script>

<style scoped>
.player-page {
  min-height: 100vh;
  padding: 20px;
  padding-bottom: 120px; /* 为歌词栏预留空间 */
}

.player-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  color: white;
}

.player-title {
  font-size: 28px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-player {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.player-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.album-cover-wrapper {
  position: relative;
  margin-bottom: 30px;
}

.album-cover {
  width: 300px;
  height: 300px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s;
  border-radius: 100%;
}

.album-cover.rotating {
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cover-shadow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.3), transparent);
  border-radius: 50%;
  z-index: -1;
  filter: blur(30px);
}

.song-details {
  text-align: center;
  margin-bottom: 30px;
}

.current-song-name {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.current-song-artist {
  font-size: 18px;
  color: #666;
  margin-bottom: 5px;
}

.current-song-album {
  font-size: 14px;
  color: #999;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
  max-width: 600px;
  margin-bottom: 30px;
}

.time-label {
  font-size: 14px;
  color: #666;
  min-width: 45px;
}

.progress-slider {
  flex: 1;
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.play-button {
  width: 70px !important;
  height: 70px !important;
  font-size: 32px !important;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 300px;
}

.volume-slider {
  flex: 1;
}

.volume-label {
  font-size: 14px;
  color: #666;
  min-width: 40px;
}

.empty-player {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.empty-icon {
  font-size: 100px;
  margin-bottom: 20px;
  opacity: 0.3;
}

.empty-text {
  font-size: 20px;
  margin-bottom: 10px;
}

.empty-hint {
  font-size: 14px;
  color: #bbb;
}

.queue-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.queue-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.queue-list {
  max-height: 400px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.2s;
}

.queue-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.queue-index {
  width: 24px;
  text-align: center;
  font-size: 14px;
  color: #999;
  font-weight: bold;
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
  margin-right: 10px;
}

.queue-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
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
}

.queue-empty {
  text-align: center;
  padding: 60px 20px;
  color: #ccc;
}

.queue-empty .el-icon {
  font-size: 60px;
  margin-bottom: 15px;
}

.queue-empty p {
  font-size: 16px;
}

@media (max-width: 768px) {
  .main-player {
    padding: 30px 20px;
  }

  .album-cover {
    width: 200px;
    height: 200px;
  }

  .current-song-name {
    font-size: 24px;
  }

  .current-song-artist {
    font-size: 16px;
  }

  .play-button {
    width: 60px !important;
    height: 60px !important;
    font-size: 28px !important;
  }
}
</style>

