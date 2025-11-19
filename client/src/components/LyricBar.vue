<template>
  <div 
    v-if="showLyric" 
    class="lyric-bar"
    ref="lyricBarRef"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="handleMouseDown"
  >
    <div class="lyric-container">
      <!-- 当前歌词 -->
      <div v-if="currentLyric" class="lyric-line current">
        <div class="lyric-text">
          <span class="lyric-progress" :style="{ width: progress + '%' }">
            {{ currentLyric.text }}
          </span>
          <span class="lyric-bg">{{ currentLyric.text }}</span>
        </div>
      </div>
      <div v-else class="lyric-line current empty">
        <div class="lyric-text">
          <span class="lyric-bg">♪ 暂无歌词 ♪</span>
        </div>
      </div>
      
      <!-- 下一句歌词 -->
      <div v-if="nextLyric" class="lyric-line next">
        <div class="lyric-text">
          <span class="lyric-bg">{{ nextLyric.text }}</span>
        </div>
      </div>
      <div v-else class="lyric-line next empty">
        <div class="lyric-text">
          <span class="lyric-bg">♪</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { parseLyric, getCurrentLyrics, getLyricProgress } from '../utils/lyric-parser'
import api from '../utils/api'

const props = defineProps({
  currentSong: {
    type: Object,
    default: null
  },
  currentTime: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})

const lyricList = ref([])
const currentLyric = ref(null)
const nextLyric = ref(null)
const progress = ref(0)

// 拖拽相关
const lyricBarRef = ref(null)
const position = ref({ x: 100, y: 100 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const userIP = ref('')

// 是否显示歌词栏
const showLyric = computed(() => {
  return props.currentSong && props.currentSong.id
})

// 加载歌词
async function loadLyric(songId) {
  if (!songId) {
    lyricList.value = []
    return
  }
  
  try {
    const result = await api.getLyric(songId)
    if (result.success && result.lyric) {
      lyricList.value = parseLyric(result.lyric)
    } else {
      lyricList.value = []
    }
  } catch (error) {
    console.error('加载歌词失败:', error)
    lyricList.value = []
  }
}

// 更新当前显示的歌词
function updateCurrentLyric() {
  if (!lyricList.value || lyricList.value.length === 0) {
    currentLyric.value = null
    nextLyric.value = null
    progress.value = 0
    return
  }
  
  const lyrics = getCurrentLyrics(lyricList.value, props.currentTime)
  currentLyric.value = lyrics.current
  nextLyric.value = lyrics.next
  
  // 计算进度
  if (lyrics.current && lyrics.next) {
    progress.value = getLyricProgress(lyrics.current, lyrics.next, props.currentTime)
  } else if (lyrics.current) {
    progress.value = 100
  } else {
    progress.value = 0
  }
}

// 定时器更新歌词
let updateTimer = null

function startUpdateTimer() {
  stopUpdateTimer()
  if (props.isPlaying) {
    updateTimer = setInterval(() => {
      updateCurrentLyric()
    }, 100) // 每100ms更新一次
  }
}

function stopUpdateTimer() {
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
}

// 监听歌曲变化
watch(() => props.currentSong?.id, (newId) => {
  if (newId) {
    loadLyric(newId)
  } else {
    lyricList.value = []
    currentLyric.value = null
    nextLyric.value = null
  }
})

// 监听播放时间变化
watch(() => props.currentTime, () => {
  updateCurrentLyric()
})

// 监听播放状态
watch(() => props.isPlaying, (isPlaying) => {
  if (isPlaying) {
    startUpdateTimer()
  } else {
    stopUpdateTimer()
  }
})

// 获取用户IP
async function getUserIP() {
  try {
    const result = await api.getUserInfo()
    if (result.success && result.data.ip) {
      userIP.value = result.data.ip
      loadLyricPosition()
    }
  } catch (error) {
    console.error('获取用户IP失败:', error)
    // 使用默认位置
    setDefaultPosition()
  }
}

// 加载歌词位置
function loadLyricPosition() {
  const key = `lyric-position-${userIP.value}`
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const pos = JSON.parse(saved)
      position.value = pos
      // 确保位置在可见范围内
      nextTick(() => {
        ensureInViewport()
      })
    } catch (error) {
      setDefaultPosition()
    }
  } else {
    setDefaultPosition()
  }
}

// 保存歌词位置
function saveLyricPosition() {
  if (userIP.value) {
    const key = `lyric-position-${userIP.value}`
    localStorage.setItem(key, JSON.stringify(position.value))
  }
}

// 设置默认位置（右下角）
function setDefaultPosition() {
  position.value = {
    x: window.innerWidth - 500,
    y: window.innerHeight - 150
  }
}

// 确保歌词在可见范围内
function ensureInViewport() {
  if (!lyricBarRef.value) return
  
  const rect = lyricBarRef.value.getBoundingClientRect()
  let { x, y } = position.value
  
  // 确保不超出视口
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width
  }
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height
  }
  
  position.value = { x, y }
}

// 鼠标按下开始拖拽
function handleMouseDown(e) {
  // 只响应左键
  if (e.button !== 0) return
  
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }
  
  // 添加全局事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  // 防止文本选中
  e.preventDefault()
}

// 鼠标移动
function handleMouseMove(e) {
  if (!isDragging.value) return
  
  position.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }
  
  e.preventDefault()
}

// 鼠标释放结束拖拽
function handleMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // 确保在视口内
    ensureInViewport()
    
    // 保存位置
    saveLyricPosition()
  }
}

onMounted(async () => {
  if (props.currentSong?.id) {
    loadLyric(props.currentSong.id)
  }
  if (props.isPlaying) {
    startUpdateTimer()
  }
  
  // 获取用户IP并加载位置
  await getUserIP()
  
  // 监听窗口大小变化
  window.addEventListener('resize', ensureInViewport)
})

onUnmounted(() => {
  stopUpdateTimer()
  
  // 清理事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', ensureInViewport)
})
</script>

<style scoped>
.lyric-bar {
  position: fixed;
  min-width: 400px;
  max-width: 800px;
  padding: 16px 24px;
  z-index: 999;
  cursor: move;
  user-select: none;
  pointer-events: auto;
}

.lyric-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.lyric-line {
  width: 100%;
  text-align: center;
  transition: all 0.3s ease;
}

.lyric-line.current {
  font-size: 24px;
  font-weight: 600;
}

.lyric-line.next {
  font-size: 18px;
  font-weight: 400;
  opacity: 0.7;
}

.lyric-line.empty {
  opacity: 0.5;
  font-style: italic;
}

.lyric-text {
  position: relative;
  display: inline-block;
  color: white;
  text-shadow: 
    0 0 8px rgba(0, 0, 0, 0.8),
    0 0 16px rgba(0, 0, 0, 0.6),
    2px 2px 4px rgba(0, 0, 0, 0.9);
}

/* 背景文字 */
.lyric-bg {
  color: rgba(255, 255, 255, 0.8);
}

/* 进度文字 */
.lyric-progress {
  position: absolute;
  top: 0;
  left: 0;
  color: #fff;
  overflow: hidden;
  white-space: nowrap;
  transition: width 0.1s linear;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 拖拽时的视觉反馈 */
.lyric-bar:active {
  cursor: grabbing;
}

/* 响应式 */
@media (max-width: 768px) {
  .lyric-bar {
    min-width: 300px;
    padding: 12px 16px;
  }
  
  .lyric-line.current {
    font-size: 18px;
  }
  
  .lyric-line.next {
    font-size: 14px;
  }
}
</style>
