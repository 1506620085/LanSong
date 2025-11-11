<template>
  <div class="admin-page">
    <!-- 权限验证中 -->
    <div v-if="checking" class="loading-container">
      <el-icon class="spin"><Loading /></el-icon>
      <p>正在验证权限...</p>
    </div>

    <!-- 无权访问 -->
    <div v-else-if="!isHost" class="access-denied">
      <el-icon class="denied-icon"><WarningFilled /></el-icon>
      <h2>无权访问</h2>
      <p>仅运行服务的主机（{{ serverIP }}）可以访问管理页面</p>
      <p class="current-ip">您的IP: {{ clientIP }}</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>

    <!-- 管理界面 -->
    <div v-else class="admin-container">
      <div class="container">
        <!-- 头部 -->
        <div class="header">
          <h1 class="title">
            <el-icon><Setting /></el-icon>
            管理设置
          </h1>
          <p class="subtitle">主机管理控制面板</p>
          <div class="host-info">
            <el-tag type="danger" size="large">主机</el-tag>
            <span>{{ serverIP }}</span>
          </div>
        </div>

        <!-- 功能区域 -->
        <div class="content">
          <!-- 系统信息 - 置顶 -->
          <el-card class="section-card">
            <template #header>
              <div class="card-header">
                <el-icon><InfoFilled /></el-icon>
                <span>系统信息</span>
              </div>
            </template>
            <div class="system-info">
              <div class="info-item">
                <span class="label">主机IP：</span>
                <span class="value">{{ serverIP }}</span>
              </div>
              <div class="info-item">
                <span class="label">用户总数：</span>
                <span class="value">{{ users.length }}</span>
              </div>
              <div class="info-item">
                <span class="label">管理权限：</span>
                <el-tag type="success" size="small">主机</el-tag>
              </div>
            </div>
          </el-card>

          <!-- 应用网格菜单 -->
          <div class="app-grid">
            <div 
              v-for="app in appList" 
              :key="app.id" 
              class="app-item"
              @click="handleAppClick(app)"
            >
              <div class="app-icon" :style="{ background: app.color }">
                <component :is="app.icon" class="icon" />
              </div>
              <div class="app-name">{{ app.name }}</div>
              <el-badge 
                v-if="app.badge" 
                :value="app.badge" 
                class="app-badge"
              />
            </div>
          </div>
        </div>

        <!-- 用户管理对话框 -->
        <el-dialog
          v-model="userDialogVisible"
          title="用户管理"
          width="800px"
          :close-on-click-modal="false"
        >
          <div class="user-list">
            <el-table :data="users" stripe>
              <el-table-column prop="ip" label="IP地址" width="180" />
              <el-table-column prop="username" label="用户名" width="150" />
              <el-table-column prop="lastUpdated" label="最后更新" width="200">
                <template #default="{ row }">
                  {{ formatTime(row.lastUpdated) }}
                </template>
              </el-table-column>
              <el-table-column label="操作">
                <template #default="{ row }">
                  <el-button size="small" type="danger" @click="handleDeleteUser(row.ip)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-dialog>

        <!-- 顶置历史对话框 -->
        <el-dialog
          v-model="historyDialogVisible"
          title="顶置历史记录"
          width="700px"
          :close-on-click-modal="false"
        >
          <div style="margin-bottom: 15px;" v-if="promoteHistory.length > 0">
            <el-button type="danger" size="small" @click="handleClearHistory">
              清除所有历史
            </el-button>
          </div>
          <div v-if="promoteHistory.length > 0" class="promote-history-list">
            <div
              v-for="record in promoteHistory"
              :key="record.queueId + record.promotedAt"
              class="history-item"
            >
              <img :src="record.albumPic + '?param=50y50'" class="history-album" />
              <div class="history-info">
                <div class="history-song">{{ record.songName }}</div>
                <div class="history-artist">{{ record.artist }}</div>
              </div>
              <div class="history-meta">
                <div class="history-time">{{ formatRelativeTime(record.promotedAt) }}</div>
                <div class="history-user">
                  <el-icon><Top /></el-icon>
                  {{ record.promotedBy }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="placeholder">
            <el-icon class="placeholder-icon"><Document /></el-icon>
            <p>暂无顶置记录</p>
          </div>
        </el-dialog>

        <!-- 操作限额对话框 -->
        <el-dialog
          v-model="quotaDialogVisible"
          title="点歌限额配置"
          width="500px"
          :close-on-click-modal="false"
        >
          <el-form :model="quotaForm" label-width="120px">
            <el-alert
              title="说明"
              type="info"
              :closable="false"
              style="margin-bottom: 20px;"
            >
              服务主机不受限制，局域网其他机器严格遵守此配置
            </el-alert>
            
            <el-form-item label="时间窗口">
              <el-input-number
                v-model="quotaForm.timeWindow"
                :min="10"
                :max="3600"
                :step="10"
                style="width: 100%;"
              />
              <span style="margin-left: 10px; color: #999;">秒</span>
              <div style="font-size: 12px; color: #999; margin-top: 5px;">
                范围：10-3600秒（{{ Math.floor(quotaForm.timeWindow / 60) }}分钟）
              </div>
            </el-form-item>
            
            <el-form-item label="最大歌曲数">
              <el-input-number
                v-model="quotaForm.maxSongs"
                :min="1"
                :max="100"
                :step="1"
                style="width: 100%;"
              />
              <span style="margin-left: 10px; color: #999;">首</span>
              <div style="font-size: 12px; color: #999; margin-top: 5px;">
                范围：1-100首
              </div>
            </el-form-item>
            
            <el-form-item>
              <div class="quota-preview">
                <el-icon style="color: #409eff; margin-right: 8px;"><InfoFilled /></el-icon>
                <span>
                  当前配置：每 <strong>{{ quotaForm.timeWindow }}秒</strong> 内最多点 <strong>{{ quotaForm.maxSongs }}首</strong> 歌
                </span>
              </div>
            </el-form-item>
          </el-form>
          
          <template #footer>
            <el-button @click="quotaDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSaveQuota" :loading="quotaSaving">
              保存配置
            </el-button>
          </template>
        </el-dialog>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Loading, 
  WarningFilled, 
  Setting, 
  UserFilled, 
  Document, 
  DocumentAdd, 
  InfoFilled,
  Top
} from '@element-plus/icons-vue'
import api from '../utils/api'

const router = useRouter()

const checking = ref(true)
const isHost = ref(false)
const serverIP = ref('')
const clientIP = ref('')
const users = ref([])
const promoteHistory = ref([])

// 对话框状态
const userDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const quotaDialogVisible = ref(false)
const quotaSaving = ref(false)

// 限额配置表单
const quotaForm = ref({
  timeWindow: 60,
  maxSongs: 3
})

// 应用列表
const appList = ref([
  {
    id: 'users',
    name: '用户管理',
    icon: UserFilled,
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    badge: 0
  },
  {
    id: 'history',
    name: '顶置历史',
    icon: Document,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    badge: 0
  },
  {
    id: 'quota',
    name: '操作限额',
    icon: DocumentAdd,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    badge: 0
  }
])

// 处理应用点击
const handleAppClick = async (app) => {
  switch (app.id) {
    case 'users':
      userDialogVisible.value = true
      break
    case 'history':
      historyDialogVisible.value = true
      break
    case 'quota':
      await fetchQuotaConfig()
      quotaDialogVisible.value = true
      break
  }
}

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

// 验证是否是主机
async function checkHostPermission() {
  try {
    const result = await api.checkAdminPermission()
    if (result.success) {
      isHost.value = result.isHost
      serverIP.value = result.serverIP
      clientIP.value = result.clientIP
      
      if (!result.isHost) {
        ElMessage.error('您没有权限访问管理页面')
      } else {
        // 加载用户列表和顶置历史
        await fetchUsers()
        await fetchPromoteHistory()
        // 更新应用徽章
        updateAppBadges()
      }
    }
  } catch (error) {
    console.error('权限验证失败:', error)
    ElMessage.error('权限验证失败')
    isHost.value = false
  } finally {
    checking.value = false
  }
}

// 获取顶置历史记录
async function fetchPromoteHistory() {
  try {
    const result = await api.getPromoteHistory(50)
    if (result.success) {
      promoteHistory.value = result.data
    }
  } catch (error) {
    console.error('获取顶置历史失败:', error)
  }
}

// 清除顶置历史
async function handleClearHistory() {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有顶置历史记录吗？此操作不可恢复！',
      '确认清除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await api.clearPromoteHistory()
    if (result.success) {
      promoteHistory.value = []
      updateAppBadges()
      ElMessage.success('顶置历史已清除')
    }
  } catch (error) {
    // 用户取消
  }
}

// 获取用户列表
async function fetchUsers() {
  try {
    const result = await api.getAllUsers()
    if (result.success) {
      users.value = Object.entries(result.data).map(([ip, user]) => ({
        ip,
        ...user
      }))
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 删除用户
async function handleDeleteUser(ip) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${ip} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // TODO: 调用删除API
    ElMessage.info('删除用户功能待实现')
    
  } catch (error) {
    // 用户取消
  }
}

// 格式化时间
function formatTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 获取限额配置
async function fetchQuotaConfig() {
  try {
    const result = await api.getQuotaConfig()
    if (result.success && result.data) {
      quotaForm.value = { ...result.data }
    }
  } catch (error) {
    console.error('获取限额配置失败:', error)
    ElMessage.error('获取限额配置失败')
  }
}

// 保存限额配置
async function handleSaveQuota() {
  if (quotaForm.value.timeWindow < 10 || quotaForm.value.timeWindow > 3600) {
    ElMessage.error('时间窗口必须在10-3600秒之间')
    return
  }
  
  if (quotaForm.value.maxSongs < 1 || quotaForm.value.maxSongs > 100) {
    ElMessage.error('歌曲数量必须在1-100首之间')
    return
  }
  
  quotaSaving.value = true
  try {
    const result = await api.updateQuotaConfig(
      quotaForm.value.timeWindow,
      quotaForm.value.maxSongs
    )
    
    if (result.success) {
      ElMessage.success('限额配置已更新')
      quotaDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '更新失败')
    }
  } catch (error) {
    console.error('更新限额配置失败:', error)
    ElMessage.error('更新限额配置失败')
  } finally {
    quotaSaving.value = false
  }
}

// 更新应用徽章
function updateAppBadges() {
  appList.value.forEach(app => {
    if (app.id === 'users') {
      app.badge = users.value.length || null
    } else if (app.id === 'history') {
      app.badge = promoteHistory.value.length || null
    }
  })
}

onMounted(() => {
  checkHostPermission()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-container,
.access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: white;
  text-align: center;
  gap: 20px;
}

.spin {
  font-size: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.denied-icon {
  font-size: 80px;
  color: #ffeb3b;
}

.access-denied h2 {
  font-size: 32px;
  margin: 0;
}

.access-denied p {
  font-size: 16px;
  opacity: 0.9;
  margin: 5px 0;
}

.current-ip {
  font-size: 14px;
  opacity: 0.7;
}

.admin-container {
  padding: 20px;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
}

.title .el-icon {
  font-size: 36px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 20px;
}

.host-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
}

.card-header .el-icon {
  font-size: 20px;
  color: #667eea;
}

.user-list {
  padding: 10px 0;
}

.promote-history-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: rgba(102, 126, 234, 0.03);
  transition: background 0.2s;
}

.history-item:hover {
  background: rgba(102, 126, 234, 0.08);
}

.history-album {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-song {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-artist {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.history-user {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.history-time {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
  text-align: center;
}

.placeholder-icon {
  font-size: 64px;
  color: #ddd;
  margin-bottom: 20px;
}

.placeholder p {
  font-size: 16px;
  margin: 5px 0;
}

.hint {
  font-size: 14px;
  opacity: 0.7;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.info-item .label {
  color: #666;
  min-width: 100px;
}

.info-item .value {
  color: #333;
  font-weight: 500;
}

/* 应用网格菜单 */
.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.app-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
}

.app-item:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.app-icon {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-icon .icon {
  font-size: 36px;
  color: white;
}

.app-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  text-align: center;
}

.app-badge {
  position: absolute;
  top: 16px;
  right: 16px;
}

@media (max-width: 768px) {
  .app-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
  }
  
  .app-icon {
    width: 60px;
    height: 60px;
  }
  
  .app-icon .icon {
    font-size: 30px;
  }
  
  .app-name {
    font-size: 14px;
  }
}

/* 限额配置预览 */
.quota-preview {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 14px;
}

.quota-preview strong {
  color: #1e3a8a;
  margin: 0 3px;
}
</style>
