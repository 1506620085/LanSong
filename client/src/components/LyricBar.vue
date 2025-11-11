<template>
  <div v-if="showLyric" class="lyric-bar">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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

onMounted(() => {
  if (props.currentSong?.id) {
    loadLyric(props.currentSong.id)
  }
  if (props.isPlaying) {
    startUpdateTimer()
  }
})

onUnmounted(() => {
  stopUpdateTimer()
})
</script>

<style scoped>
.lyric-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.80) 0%, rgba(118, 75, 162, 0.80) 100%); /* 背景渐变 */
  backdrop-filter: blur(10px); /* 背景模糊 */
  -webkit-backdrop-filter: blur(10px); /* 背景模糊 */
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15); /* 阴影 */
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 40px;
}

.lyric-container {
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
}

/* 背景文字 */
.lyric-bg {
  color: rgba(255, 255, 255, 0.6);
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

/* 响应式 */
@media (max-width: 768px) {
  .lyric-bar {
    height: 80px;
    padding: 0 20px;
  }
  
  .lyric-line.current {
    font-size: 18px;
  }
  
  .lyric-line.next {
    font-size: 14px;
  }
}
</style>
