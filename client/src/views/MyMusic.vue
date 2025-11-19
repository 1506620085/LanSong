<template>
  <div class="my-music">
    <!-- 未登录提示 -->
    <div v-if="!localAuthState.isLoggedIn" class="login-prompt">
      <el-icon class="prompt-icon"><User /></el-icon>
      <h3>请先登录网易云音乐</h3>
      <p>登录后可以查看您的歌单和喜欢的音乐</p>
      <el-button type="primary" @click="showLocalLoginDialog = true">
        <el-icon><Lock /></el-icon>
        立即登录
      </el-button>
    </div>

    <!-- 主内容区 -->
    <div v-else class="content">
      <!-- 左侧歌单列表 -->
      <div class="playlist-sidebar">
        <div class="sidebar-header">
          <h3>我的歌单</h3>
          <el-button text @click="refreshPlaylists" :loading="loading">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="playlist-tree">
          <!-- 创建的歌单 -->
          <div class="playlist-category">
            <div class="category-header" @click="toggleCategory('created')">
              <el-icon :class="{'rotated': !createdCollapsed}">
                <ArrowRight />
              </el-icon>
              <span>创建的歌单 ({{ playlists.created.length }})</span>
            </div>
            <div v-show="!createdCollapsed" class="category-content">
              <div
                v-for="playlist in playlists.created"
                :key="playlist.id"
                class="playlist-item"
                :class="{ 'active': currentPlaylist?.id === playlist.id }"
                @click="selectPlaylist(playlist)"
              >
                <img :src="playlist.coverImgUrl + '?param=40y40'" class="playlist-cover" />
                <div class="playlist-info">
                  <div class="playlist-name">{{ playlist.name }}</div>
                  <div class="playlist-count">{{ playlist.trackCount }}首</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 收藏的歌单 -->
          <div class="playlist-category">
            <div class="category-header" @click="toggleCategory('subscribed')">
              <el-icon :class="{'rotated': !subscribedCollapsed}">
                <ArrowRight />
              </el-icon>
              <span>收藏的歌单 ({{ playlists.subscribed.length }})</span>
            </div>
            <div v-show="!subscribedCollapsed" class="category-content">
              <div
                v-for="playlist in playlists.subscribed"
                :key="playlist.id"
                class="playlist-item"
                :class="{ 'active': currentPlaylist?.id === playlist.id }"
                @click="selectPlaylist(playlist)"
              >
                <img :src="playlist.coverImgUrl + '?param=40y40'" class="playlist-cover" />
                <div class="playlist-info">
                  <div class="playlist-name">{{ playlist.name }}</div>
                  <div class="playlist-count">{{ playlist.trackCount }}首</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧歌曲详情 -->
      <div class="playlist-detail">
        <div v-if="loadingDetail" class="loading-container">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="currentPlaylist" class="detail-content">
          <!-- 歌单头部 -->
          <div class="detail-header">
            <img :src="currentPlaylist.coverImgUrl + '?param=200y200'" class="detail-cover" />
            <div class="detail-info">
              <div class="detail-tags">
                <el-tag type="danger" size="small">歌单</el-tag>
              </div>
              <h2 class="detail-title">{{ currentPlaylist.name }}</h2>
              <div class="detail-meta">
                <el-avatar :size="24" :src="localAuthState.profile?.avatarUrl + '?param=24y24'" />
                <span class="creator-name">{{ localAuthState.profile?.nickname }}</span>
                <span class="detail-time">{{ formatDate(currentPlaylist.createTime) }}</span>
              </div>
              <div v-if="currentPlaylist.description" class="detail-desc">
                {{ currentPlaylist.description }}
              </div>
              <div class="detail-actions">
                <el-button type="primary" @click="playAll">
                  <el-icon><VideoPlay /></el-icon>
                  播放全部
                </el-button>
                <el-button @click="addAllToQueue">
                  <el-icon><Plus /></el-icon>
                  添加到播放列表
                </el-button>
              </div>
            </div>
          </div>

          <!-- 歌曲列表 -->
          <div class="song-list-container">
            <div class="song-list-header">
              <h3>歌曲列表</h3>
              <span class="song-count">共{{ tracks.length }}首</span>
            </div>

            <el-table :data="tracks" stripe style="width: 100%" @row-dblclick="handleRowDbClick">
              <el-table-column type="index" label="#" width="60" align="center" />
              <el-table-column label="歌曲名称" min-width="200">
                <template #default="{ row }">
                  <div class="song-name-cell">
                    <span class="song-name">{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="歌手" min-width="150">
                <template #default="{ row }">
                  {{ row.artists.map(a => a.name).join(' / ') }}
                </template>
              </el-table-column>
              <el-table-column label="专辑" min-width="150" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.album.name }}
                </template>
              </el-table-column>
              <el-table-column label="时长" width="100" align="center">
                <template #default="{ row }">
                  {{ formatDuration(row.duration) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button 
                    link 
                    type="primary" 
                    @click="addSongToQueue(row)"
                    :loading="addingMap[row.id]"
                  >
                    <el-icon><Plus /></el-icon>
                    点歌
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-else class="empty-container">
          <el-icon class="empty-icon"><FolderOpened /></el-icon>
          <p>请从左侧选择一个歌单</p>
        </div>
      </div>
    </div>

    <!-- 本机用户登录对话框 -->
    <el-dialog
      v-model="showLocalLoginDialog"
      title="本机网易云登录"
      width="450px"
      :close-on-click-modal="false"
    >
      <LocalLoginDialog @success="handleLoginSuccess" @close="showLocalLoginDialog = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  User, Lock, Refresh, ArrowRight, Loading, VideoPlay, Plus, 
  FolderOpened 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { localAuthState, fetchLocalAuthStatus } from '../utils/localAuth'
import api from '../utils/api'
import LocalLoginDialog from '../components/LocalLoginDialog.vue'

const router = useRouter()

// 状态管理
const loading = ref(false)
const loadingDetail = ref(false)
const showLocalLoginDialog = ref(false)

// 歌单数据
const playlists = reactive({
  created: [],
  subscribed: []
})

// 当前选中的歌单
const currentPlaylist = ref(null)
const tracks = ref([])

// 折叠状态
const createdCollapsed = ref(false)
const subscribedCollapsed = ref(false)

// 点歌加载状态
const addingMap = reactive({})

// 切换分类折叠
function toggleCategory(category) {
  if (category === 'created') {
    createdCollapsed.value = !createdCollapsed.value
  } else {
    subscribedCollapsed.value = !subscribedCollapsed.value
  }
}

// 获取歌单列表
async function fetchPlaylists() {
  loading.value = true
  try {
    const result = await api.getMyPlaylists()
    if (result.success) {
      playlists.created = result.data.created
      playlists.subscribed = result.data.subscribed

      // 默认选中"我喜欢的音乐"（通常是第一个创建的歌单）
      if (playlists.created.length > 0 && !currentPlaylist.value) {
        await selectPlaylist(playlists.created[0])
      }
    } else {
      ElMessage.error(result.error || '获取歌单失败')
    }
  } catch (error) {
    console.error('获取歌单失败:', error)
    ElMessage.error('获取歌单失败')
  } finally {
    loading.value = false
  }
}

// 刷新歌单
async function refreshPlaylists() {
  await fetchPlaylists()
  ElMessage.success('刷新成功')
}

// 选择歌单
async function selectPlaylist(playlist) {
  if (currentPlaylist.value?.id === playlist.id) return

  currentPlaylist.value = playlist
  await fetchPlaylistDetail(playlist.id)
}

// 获取歌单详情
async function fetchPlaylistDetail(playlistId) {
  loadingDetail.value = true
  try {
    const result = await api.getPlaylistDetail(playlistId)
    if (result.success) {
      tracks.value = result.data.tracks
      // 更新当前歌单的完整信息
      Object.assign(currentPlaylist.value, result.data)
    } else {
      ElMessage.error(result.error || '获取歌单详情失败')
    }
  } catch (error) {
    console.error('获取歌单详情失败:', error)
    ElMessage.error('获取歌单详情失败')
  } finally {
    loadingDetail.value = false
  }
}

// 添加歌曲到播放队列
async function addSongToQueue(song) {
  addingMap[song.id] = true
  try {
    // 先获取歌曲详情（包含播放URL）
    const detailRes = await api.getSongDetail(song.id)
    if (!detailRes.success || !detailRes.data || detailRes.data.length === 0) {
      ElMessage.error('获取歌曲详情失败')
      return
    }

    // getSongDetail返回的是数组，取第一个
    const songDetail = detailRes.data[0]

    // 添加到队列
    const queueRes = await api.addToQueue(songDetail)
    if (queueRes.success) {
      ElMessage.success(`已添加：${song.name}`)
    } else {
      ElMessage.error(queueRes.error || '添加失败')
    }
  } catch (error) {
    console.error('添加歌曲失败:', error)
    ElMessage.error('添加失败')
  } finally {
    delete addingMap[song.id]
  }
}

// 双击行播放
function handleRowDbClick(row) {
  addSongToQueue(row)
}

// 播放全部
async function playAll() {
  if (tracks.value.length === 0) {
    ElMessage.warning('歌单为空')
    return
  }

  ElMessage.info('正在添加歌曲...')
  
  for (const track of tracks.value.slice(0, 10)) { // 限制一次添加10首
    await addSongToQueue(track)
  }
  
  if (tracks.value.length > 10) {
    ElMessage.info(`已添加前10首歌曲，共${tracks.value.length}首`)
  }
}

// 添加全部到播放列表
async function addAllToQueue() {
  await playAll()
}

// 格式化时长
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN')
}

// 登录成功回调
async function handleLoginSuccess() {
  showLocalLoginDialog.value = false
  await fetchLocalAuthStatus()
  await fetchPlaylists()
}

// 监听登录状态
watch(() => localAuthState.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    fetchPlaylists()
  }
})

onMounted(async () => {
  await fetchLocalAuthStatus()
  
  if (!localAuthState.isLoggedIn) {
    // 未登录，显示登录提示
    return
  }

  // 已登录，获取歌单
  await fetchPlaylists()
})
</script>

<style scoped>
.my-music {
  height: calc(100vh - 60px);
  overflow: hidden;
  background: #f5f5f5;
}

/* 登录提示 */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
  color: #666;
}

.prompt-icon {
  font-size: 80px;
  color: #ddd;
}

.login-prompt h3 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.login-prompt p {
  margin: 0;
  font-size: 14px;
  color: #999;
}

/* 主内容区 */
.content {
  display: flex;
  height: 100%;
  gap: 0;
}

/* 左侧歌单列表 */
.playlist-sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.playlist-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.playlist-category {
  margin-bottom: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.category-header:hover {
  background: #f5f5f5;
  color: #333;
}

.category-header .el-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.category-header .el-icon.rotated {
  transform: rotate(90deg);
}

.category-content {
  padding: 4px 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px 8px 40px;
  cursor: pointer;
  transition: all 0.2s;
}

.playlist-item:hover {
  background: #f5f5f5;
}

.playlist-item.active {
  background: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.playlist-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-name {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-count {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* 右侧歌曲详情 */
.playlist-detail {
  flex: 1;
  background: white;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  gap: 16px;
}

.loading-container .el-icon,
.empty-container .empty-icon {
  font-size: 64px;
  color: #ddd;
}

.detail-content {
  padding: 24px;
}

.detail-header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-cover {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-tags {
  display: flex;
  gap: 8px;
}

.detail-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.creator-name {
  font-weight: 500;
  color: #1890ff;
}

.detail-time {
  color: #999;
}

.detail-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.song-list-container {
  margin-top: 8px;
}

.song-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.song-list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.song-count {
  font-size: 14px;
  color: #999;
}

.song-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.song-name {
  font-weight: 500;
  color: #333;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background: #fafafa;
}
</style>
