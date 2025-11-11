// 歌词解析器

/**
 * 解析LRC格式歌词
 * @param {string} lrcString - LRC格式的歌词字符串
 * @returns {Array} 解析后的歌词数组 [{ time: 12.34, text: '歌词内容' }]
 */
export function parseLyric(lrcString) {
  if (!lrcString) return []
  
  const lines = lrcString.split('\n')
  const lyricList = []
  
  // 时间标签正则: [mm:ss.xx] 或 [mm:ss.xxx]
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
  
  for (const line of lines) {
    const text = line.replace(timeRegex, '').trim()
    if (!text) continue
    
    // 提取所有时间标签
    let match
    timeRegex.lastIndex = 0 // 重置正则索引
    
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = parseInt(match[3].padEnd(3, '0')) // 处理两位或三位毫秒
      
      const time = minutes * 60 + seconds + milliseconds / 1000
      
      lyricList.push({
        time,
        text
      })
    }
  }
  
  // 按时间排序
  lyricList.sort((a, b) => a.time - b.time)
  
  return lyricList
}

/**
 * 根据当前播放时间获取应该显示的歌词索引
 * @param {Array} lyricList - 歌词数组
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {number} 当前歌词的索引
 */
export function getCurrentLyricIndex(lyricList, currentTime) {
  if (!lyricList || lyricList.length === 0) return -1
  
  for (let i = lyricList.length - 1; i >= 0; i--) {
    if (currentTime >= lyricList[i].time) {
      return i
    }
  }
  
  return -1
}

/**
 * 获取当前应该显示的两行歌词
 * @param {Array} lyricList - 歌词数组
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {Object} { current: {}, next: {} }
 */
export function getCurrentLyrics(lyricList, currentTime) {
  const index = getCurrentLyricIndex(lyricList, currentTime)
  
  if (index === -1) {
    return {
      current: null,
      next: lyricList[0] || null
    }
  }
  
  return {
    current: lyricList[index],
    next: lyricList[index + 1] || null
  }
}

/**
 * 计算当前歌词的进度百分比（用于颜色渐变）
 * @param {Object} currentLyric - 当前歌词对象
 * @param {Object} nextLyric - 下一句歌词对象
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {number} 进度百分比 0-100
 */
export function getLyricProgress(currentLyric, nextLyric, currentTime) {
  if (!currentLyric) return 0
  if (!nextLyric) return 100
  
  const duration = nextLyric.time - currentLyric.time
  const elapsed = currentTime - currentLyric.time
  
  const progress = Math.min(Math.max((elapsed / duration) * 100, 0), 100)
  
  return progress
}
