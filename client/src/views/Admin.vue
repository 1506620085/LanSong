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
          <!-- 用户管理 -->
          <el-card class="section-card">
            <template #header>
              <div class="card-header">
                <el-icon><UserFilled /></el-icon>
                <span>用户管理</span>
              </div>
            </template>
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
          </el-card>

          <!-- 操作限额配置（待开发） -->
          <el-card class="section-card">
            <template #header>
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>操作限额配置</span>
                <el-tag type="info" size="small">待开发</el-tag>
              </div>
            </template>
            <div class="placeholder">
              <el-icon class="placeholder-icon"><DocumentAdd /></el-icon>
              <p>功能开发中，敬请期待...</p>
              <p class="hint">未来将支持配置局域网其他机器的操作限额</p>
            </div>
          </el-card>

          <!-- 系统信息 -->
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
        </div>
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
  InfoFilled 
} from '@element-plus/icons-vue'
import api from '../utils/api'

const router = useRouter()

const checking = ref(true)
const isHost = ref(false)
const serverIP = ref('')
const clientIP = ref('')
const users = ref([])

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
        // 加载用户列表
        await fetchUsers()
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
</style>
