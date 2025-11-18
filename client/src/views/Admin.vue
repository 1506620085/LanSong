<template>
  <div class="admin-page">
    <!-- 权限验证中 -->
    <div v-if="checking" class="loading-container">
      <el-icon class="spin"><Loading /></el-icon>
      <p>正在验证权限...</p>
    </div>

    <!-- 需要密码验证 -->
    <div v-else-if="!hasAdminAccess && !isHost" class="password-required">
      <div class="password-card">
        <el-icon class="lock-icon"><Lock /></el-icon>
        <h2>管理员身份验证</h2>
        <p class="hint-text">您不是主机用户，需要输入管理密码才能访问</p>
        <p class="current-ip">您的IP: {{ clientIP }}</p>
        <p class="server-hint">主机IP: {{ serverIP }}（无需密码）</p>
        
        <el-form @submit.prevent="handleVerifyPassword" style="margin-top: 30px;">
          <el-form-item>
            <el-input
              v-model="adminPassword"
              type="password"
              placeholder="请输入管理密码"
              size="large"
              show-password
              clearable
              :disabled="verifying"
              @keyup.enter="handleVerifyPassword"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              size="large" 
              style="width: 100%;"
              :loading="verifying"
              @click="handleVerifyPassword"
            >
              验证密码
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-button 
              size="large" 
              style="width: 100%;"
              @click="$router.push('/')"
            >
              返回首页
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 管理界面 -->
    <div v-else-if="hasAdminAccess" class="admin-container">
      <div class="container">
        <!-- 头部 -->
        <div class="header">
          <h1 class="title">
            <el-icon><Setting /></el-icon>
            管理设置
          </h1>
          <p class="subtitle">主机管理控制面板</p>
          <div class="host-info">
            <el-tag :type="isHost ? 'danger' : 'warning'" size="large">
              {{ isHost ? '主机' : '管理员' }}
            </el-tag>
            <span>{{ isHost ? serverIP : clientIP }}</span>
            <el-button 
              v-if="!isHost" 
              type="danger" 
              size="small" 
              @click="handleLogout"
              style="margin-left: 15px;"
            >
              退出管理
            </el-button>
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
                <el-tag :type="isHost ? 'success' : 'warning'" size="small">
                  {{ isHost ? '主机（无限制）' : '管理员（密码验证）' }}
                </el-tag>
              </div>
              <div class="info-item" v-if="!isHost">
                <span class="label">会话到期：</span>
                <span class="value">24小时</span>
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
                <svg v-if="app.id === 'likePermission'" class="icon heart-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path d="M923 283.6c-13.4-31.1-32.6-58.9-56.9-82.8-24.3-23.8-52.5-42.4-84-55.5-32.5-13.5-66.9-20.3-102.4-20.3-49.3 0-97.4 13.5-139.2 39-10 6.1-19.5 12.8-28.5 20.1-9-7.3-18.5-14-28.5-20.1-41.8-25.5-89.9-39-139.2-39-35.5 0-69.9 6.8-102.4 20.3-31.4 13-59.7 31.7-84 55.5-24.4 23.9-43.5 51.7-56.9 82.8-13.9 32.3-20.9 66.5-20.9 101.9 0 33.3 6.8 68 20.3 103.3 11.3 29.5 27.5 60.1 48.2 91 32.8 48.9 77.9 99.9 133.9 151.6 92.8 85.7 184.7 144.9 188.6 147.3l23.7 15.2c10.5 6.7 24 6.7 34.5 0l23.7-15.2c3.9-2.5 95.7-61.6 188.6-147.3 56-51.7 101.1-102.7 133.9-151.6 20.7-30.9 37-61.5 48.2-91 13.5-35.3 20.3-70 20.3-103.3 0.1-35.3-7-69.6-20.9-101.9z" fill="white" />
                </svg>
                <component v-else :is="app.icon" class="icon" />
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
          title="操作限额配置"
          width="700px"
          :close-on-click-modal="false"
        >
          <el-alert
            title="说明"
            type="info"
            :closable="false"
            style="margin-bottom: 20px;"
          >
            服务主机不受限制，局域网其他机器严格遵守此配置
          </el-alert>
          
          <el-tabs v-model="activeQuotaTab" type="card">
            <!-- 点歌限额 -->
            <el-tab-pane label="点歌限额" name="song">
              <el-form :model="quotaForms.song" label-width="120px">
                <el-form-item label="时间窗口">
                  <el-input-number
                    v-model="quotaForms.song.timeWindow"
                    :min="10"
                    :max="3600"
                    :step="10"
                    style="width: 100%;"
                  />
                  <span style="margin-left: 10px; color: #999;">秒</span>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    范围：10-3600秒（{{ Math.floor(quotaForms.song.timeWindow / 60) }}分钟）
                  </div>
                </el-form-item>
                
                <el-form-item label="最大操作数">
                  <el-input-number
                    v-model="quotaForms.song.maxOperations"
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
                      当前配置：每 <strong>{{ quotaForms.song.timeWindow }}秒</strong> 内最多点 <strong>{{ quotaForms.song.maxOperations }}首</strong> 歌
                    </span>
                  </div>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <!-- 切歌限额 -->
            <el-tab-pane label="切歌限额" name="skip">
              <el-form :model="quotaForms.skip" label-width="120px">
                <el-form-item label="时间窗口">
                  <el-input-number
                    v-model="quotaForms.skip.timeWindow"
                    :min="10"
                    :max="3600"
                    :step="10"
                    style="width: 100%;"
                  />
                  <span style="margin-left: 10px; color: #999;">秒</span>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    范围：10-3600秒（{{ Math.floor(quotaForms.skip.timeWindow / 60) }}分钟）
                  </div>
                </el-form-item>
                
                <el-form-item label="最大操作数">
                  <el-input-number
                    v-model="quotaForms.skip.maxOperations"
                    :min="1"
                    :max="100"
                    :step="1"
                    style="width: 100%;"
                  />
                  <span style="margin-left: 10px; color: #999;">次</span>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    范围：1-100次
                  </div>
                </el-form-item>
                
                <el-form-item>
                  <div class="quota-preview">
                    <el-icon style="color: #f56c6c; margin-right: 8px;"><InfoFilled /></el-icon>
                    <span>
                      当前配置：每 <strong>{{ quotaForms.skip.timeWindow }}秒</strong> 内最多切歌 <strong>{{ quotaForms.skip.maxOperations }}次</strong>
                    </span>
                  </div>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <!-- 顶置限额 -->
            <el-tab-pane label="顶置限额" name="promote">
              <el-form :model="quotaForms.promote" label-width="120px">
                <el-form-item label="时间窗口">
                  <el-input-number
                    v-model="quotaForms.promote.timeWindow"
                    :min="10"
                    :max="3600"
                    :step="10"
                    style="width: 100%;"
                  />
                  <span style="margin-left: 10px; color: #999;">秒</span>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    范围：10-3600秒（{{ Math.floor(quotaForms.promote.timeWindow / 60) }}分钟）
                  </div>
                </el-form-item>
                
                <el-form-item label="最大操作数">
                  <el-input-number
                    v-model="quotaForms.promote.maxOperations"
                    :min="1"
                    :max="100"
                    :step="1"
                    style="width: 100%;"
                  />
                  <span style="margin-left: 10px; color: #999;">次</span>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    范围：1-100次
                  </div>
                </el-form-item>
                
                <el-form-item>
                  <div class="quota-preview">
                    <el-icon style="color: #e6a23c; margin-right: 8px;"><InfoFilled /></el-icon>
                    <span>
                      当前配置：每 <strong>{{ quotaForms.promote.timeWindow }}秒</strong> 内最多顶置 <strong>{{ quotaForms.promote.maxOperations }}次</strong>
                    </span>
                  </div>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          
          <template #footer>
            <el-button @click="quotaDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSaveQuota" :loading="quotaSaving">
              保存配置
            </el-button>
          </template>
        </el-dialog>

        <!-- 喜欢权限对话框 -->
        <el-dialog
          v-model="likePermissionDialogVisible"
          title="喜欢权限配置"
          width="800px"
          :close-on-click-modal="false"
        >
          <el-alert
            title="说明"
            type="info"
            :closable="false"
            style="margin-bottom: 20px;"
          >
            配置哪些用户可以喜欢歌曲，主机用户始终拥有权限
          </el-alert>

          <el-form label-width="100px">
            <el-form-item label="权限模式">
              <el-radio-group v-model="likePermissionMode">
                <el-radio value="all">所有用户</el-radio>
                <el-radio value="whitelist">白名单</el-radio>
              </el-radio-group>
              <div style="font-size: 12px; color: #999; margin-top: 5px;">
                {{ likePermissionMode === 'all' ? '所有用户都可以喜欢歌曲' : '只有白名单内的用户可以喜欢歌曲' }}
              </div>
            </el-form-item>

            <el-form-item label="用户列表" v-if="likePermissionMode === 'whitelist'">
              <div style="width: 100%;">
                <div style="margin-bottom: 10px; color: #666; font-size: 13px;">
                  已授权 {{ likeAllowedUsers.length }} / {{ users.length }} 个用户
                </div>
                <el-table :data="users" stripe max-height="400" v-if="users.length > 0">
                  <el-table-column prop="ip" label="IP地址" width="150" />
                  <el-table-column prop="username" label="用户名" width="150">
                    <template #default="{ row }">
                      <span v-if="row.username">{{ row.username }}</span>
                      <el-tag v-else type="info" size="small">未设置</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="权限状态" width="120">
                    <template #default="{ row }">
                      <el-tag v-if="row.ip === serverIP || row.ip === '127.0.0.1'" type="danger" size="small">
                        主机
                      </el-tag>
                      <el-tag v-else-if="row.username && likeAllowedUsers.includes(row.username)" type="success" size="small">
                        已授权
                      </el-tag>
                      <el-tag v-else-if="row.username" type="info" size="small">
                        未授权
                      </el-tag>
                      <el-tag v-else type="warning" size="small">
                        需设置用户名
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{ row }">
                      <el-button v-if="row.ip === serverIP || row.ip === '127.0.0.1'" type="danger" size="small" disabled>
                        主机用户
                      </el-button>
                      <el-button
                        v-else-if="row.username && !likeAllowedUsers.includes(row.username)"
                        type="primary"
                        size="small"
                        @click="addAllowedUser(row.username)"
                      >
                        赋予权限
                      </el-button>
                      <el-button
                        v-else-if="row.username && likeAllowedUsers.includes(row.username)"
                        type="danger"
                        size="small"
                        @click="removeAllowedUser(row.username)"
                      >
                        移除权限
                      </el-button>
                      <el-button v-else type="info" size="small" disabled>
                        未设置用户名
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <el-empty
                  v-else
                  description="暂无用户"
                  :image-size="80"
                />
              </div>
            </el-form-item>
          </el-form>

          <template #footer>
            <el-button @click="likePermissionDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveLikePermissions" :loading="savingLikePermission">
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
  Lock,
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
const hasAdminAccess = ref(false)
const serverIP = ref('')
const clientIP = ref('')
const users = ref([])
const promoteHistory = ref([])

// 密码验证
const adminPassword = ref('')
const verifying = ref(false)

// 对话框状态
const userDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const quotaDialogVisible = ref(false)
const quotaSaving = ref(false)
const likePermissionDialogVisible = ref(false)

// 喜欢权限配置
const likePermissionMode = ref('all') // 'all' 或 'whitelist'
const likeAllowedUsers = ref([])
const savingLikePermission = ref(false)

// 限额配置表单
const activeQuotaTab = ref('song')
const quotaForms = ref({
  song: {
    timeWindow: 60,
    maxOperations: 3
  },
  skip: {
    timeWindow: 300,
    maxOperations: 2
  },
  promote: {
    timeWindow: 120,
    maxOperations: 1
  }
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
  },
  {
    id: 'likePermission',
    name: '喜欢权限',
    icon: null,  // 使用自定义SVG爱心图标
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
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
    case 'likePermission':
      await fetchLikePermissions()
      likePermissionDialogVisible.value = true
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

// 验证管理权限
async function checkHostPermission() {
  try {
    const result = await api.checkAdminPermission()
    if (result.success) {
      isHost.value = result.isHost
      hasAdminAccess.value = result.hasAdminAccess
      serverIP.value = result.serverIP
      clientIP.value = result.clientIP
      
      if (result.hasAdminAccess) {
        // 有管理权限，加载数据
        await fetchUsers()
        await fetchPromoteHistory()
        updateAppBadges()
      }
    }
  } catch (error) {
    console.error('权限验证失败:', error)
    ElMessage.error('权限验证失败')
    isHost.value = false
    hasAdminAccess.value = false
  } finally {
    checking.value = false
  }
}

// 验证管理密码
async function handleVerifyPassword() {
  if (!adminPassword.value) {
    ElMessage.warning('请输入管理密码')
    return
  }
  
  verifying.value = true
  try {
    const result = await api.verifyAdminPassword(adminPassword.value)
    if (result.success) {
      // 保存token
      localStorage.setItem('adminToken', result.token)
      ElMessage.success('密码验证成功')
      
      // 重新检查权限
      checking.value = true
      await checkHostPermission()
    } else {
      ElMessage.error(result.error || '密码错误')
      adminPassword.value = ''
    }
  } catch (error) {
    console.error('密码验证失败:', error)
    ElMessage.error('密码验证失败')
  } finally {
    verifying.value = false
  }
}

// 退出管理会话
async function handleLogout() {
  try {
    await ElMessageBox.confirm(
      '确定要退出管理会话吗？退出后需要重新输入密码才能访问。',
      '确认退出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.logoutAdminSession()
    localStorage.removeItem('adminToken')
    ElMessage.success('已退出管理会话')
    
    // 重新检查权限
    hasAdminAccess.value = false
    checking.value = true
    await checkHostPermission()
  } catch (error) {
    // 用户取消或退出失败
    if (error !== 'cancel') {
      console.error('退出失败:', error)
    }
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

// 获取喜欢权限配置
async function fetchLikePermissions() {
  try {
    const result = await api.getAdminConfig()
    if (result.success && result.data && result.data.likePermissions) {
      const { allowedUsers, mode } = result.data.likePermissions
      likePermissionMode.value = mode || 'all'
      likeAllowedUsers.value = allowedUsers || []
    }
  } catch (error) {
    console.error('获取喜欢权限配置失败:', error)
    ElMessage.error('获取权限配置失败')
  }
}

// 添加允许的用户
function addAllowedUser(username) {
  if (!username) {
    ElMessage.warning('用户名无效')
    return
  }
  if (likeAllowedUsers.value.includes(username)) {
    ElMessage.warning('该用户已拥有权限')
    return
  }
  likeAllowedUsers.value.push(username)
  ElMessage.success(`已赋予 ${username} 喜欢权限`)
}

// 移除允许的用户
function removeAllowedUser(username) {
  const index = likeAllowedUsers.value.indexOf(username)
  if (index > -1) {
    likeAllowedUsers.value.splice(index, 1)
    ElMessage.success(`已移除 ${username} 的喜欢权限`)
  }
}

// 保存喜欢权限配置
async function saveLikePermissions() {
  savingLikePermission.value = true
  try {
    const allowedUsers = likePermissionMode.value === 'all' ? [] : likeAllowedUsers.value
    const mode = likePermissionMode.value
    const result = await api.updateLikePermissions(allowedUsers, mode)
    if (result.success) {
      ElMessage.success('权限配置已保存')
      likePermissionDialogVisible.value = false
    } else {
      ElMessage.error(result.error || '保存失败')
    }
  } catch (error) {
    console.error('保存喜欢权限配置失败:', error)
    ElMessage.error('保存失败')
  } finally {
    savingLikePermission.value = false
  }
}

// 获取限额配置
async function fetchQuotaConfig() {
  try {
    const result = await api.getQuotaConfig()
    if (result.success && result.data) {
      // 适配新的数据结构
      if (result.data.song) {
        quotaForms.value.song = { ...result.data.song }
      }
      if (result.data.skip) {
        quotaForms.value.skip = { ...result.data.skip }
      }
      if (result.data.promote) {
        quotaForms.value.promote = { ...result.data.promote }
      }
      
      // 兼容旧格式
      if (result.data.timeWindow && result.data.maxSongs) {
        quotaForms.value.song = {
          timeWindow: result.data.timeWindow,
          maxOperations: result.data.maxSongs
        }
      }
    }
  } catch (error) {
    console.error('获取限额配置失败:', error)
    ElMessage.error('获取限额配置失败')
  }
}

// 保存限额配置
async function handleSaveQuota() {
  const currentForm = quotaForms.value[activeQuotaTab.value]
  
  // 验证当前标签页的配置
  if (currentForm.timeWindow < 10 || currentForm.timeWindow > 3600) {
    ElMessage.error('时间窗口必须在10-3600秒之间')
    return
  }
  
  if (currentForm.maxOperations < 1 || currentForm.maxOperations > 100) {
    ElMessage.error('操作数量必须在1-100次之间')
    return
  }
  
  quotaSaving.value = true
  try {
    let result
    
    if (activeQuotaTab.value === 'song') {
      // 保持向后兼容，使用旧API
      result = await api.updateQuotaConfig(
        currentForm.timeWindow,
        currentForm.maxOperations
      )
    } else {
      // 使用新API
      result = await api.updateOperationQuotaConfig(
        activeQuotaTab.value,
        currentForm.timeWindow,
        currentForm.maxOperations
      )
    }
    
    if (result.success) {
      const operationNames = {
        song: '点歌',
        skip: '切歌',
        promote: '顶置'
      }
      ElMessage.success(`${operationNames[activeQuotaTab.value]}限额配置已更新`)
      
      // 如果保存成功，可以选择关闭对话框或切换到下一个标签页
      // quotaDialogVisible.value = false
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
.access-denied,
.password-required {
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

.app-icon .heart-icon {
  width: 36px;
  height: 36px;
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
  
  .app-icon .heart-icon {
    width: 30px;
    height: 30px;
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

/* 密码验证界面 */
.password-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.lock-icon {
  font-size: 64px;
  color: #667eea;
  margin-bottom: 20px;
}

.password-card h2 {
  font-size: 28px;
  color: #333;
  margin: 10px 0 15px 0;
}

.hint-text {
  font-size: 15px;
  color: #666;
  margin-bottom: 10px;
  line-height: 1.5;
}

.current-ip {
  font-size: 14px;
  color: #999;
  margin: 5px 0;
}

.server-hint {
  font-size: 13px;
  color: #999;
  margin: 5px 0 0 0;
}

@media (max-width: 768px) {
  .password-card {
    padding: 30px 20px;
  }
  
  .lock-icon {
    font-size: 48px;
  }
  
  .password-card h2 {
    font-size: 24px;
  }
}
</style>
