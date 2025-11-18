<template>
  <div>
    <div class="nav">
      <div class="left">
        <div class="brand" @click="$router.push('/')">
          <el-icon><Headset /></el-icon>
          <span>局域网点歌</span>
        </div>
        <div class="links">
          <el-button text :type="route.name==='Request' ? 'primary' : ''" @click="$router.push('/')">点歌</el-button>
          <el-button text :type="route.name==='Player' ? 'primary' : ''" @click="$router.push('/player')">播放器</el-button>
        </div>
      </div>
      <div class="right">
        <!-- 本机用户信息 -->
        <div class="local-user-container">
          <el-dropdown trigger="hover">
            <div class="local-user-info">
              <el-icon class="local-user-icon"><Monitor /></el-icon>
              <div class="local-user-details">
                <span class="local-user-ip">
                  <span v-if="localUserInfo.isHost" class="host-badge">（主机）</span>
                  {{ localUserInfo.ip || '获取中...' }}
                </span>
                <span class="local-user-name" :class="{ 'no-username': !localUserInfo.username }">
                  {{ localUserInfo.username || '点击设置用户名' }}
                </span>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="showUsernameDialog = true">
                  <el-icon><User /></el-icon>
                  设置用户名
                </el-dropdown-item>
                <el-dropdown-item v-if="localUserInfo.isHost" divided @click="openAdmin">
                  <el-icon><Setting /></el-icon>
                  管理设置
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          
          <!-- 本机用户的网易云登录状态 -->
          <div v-if="localAuthState.isLoggedIn && localAuthState.profile" class="local-auth-status">
            <el-dropdown trigger="hover">
              <div class="local-auth-trigger">
                <img :src="localAuthState.profile.avatarUrl + '?param=28y28'" class="local-avatar" />
                <span class="local-nickname">{{ localAuthState.profile.nickname }}</span>
                <el-icon class="arrow-icon"><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="doLocalLogout">退出网易云</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div v-else class="local-auth-entry" @click="openLocalLogin">
            <el-icon class="local-auth-icon"><User /></el-icon>
            <span class="local-auth-text">网易云未登录</span>
          </div>
        </div>
        
        <!-- 竖条分隔符 -->
        <div class="divider"></div>
        
        <!-- 登录用户信息 -->
        <div v-if="authState.isLoggedIn && authState.profile" class="user">
          <el-dropdown trigger="hover">
            <div class="user-info-trigger">
              <img :src="authState.profile.avatarUrl + '?param=40y40'" class="avatar" />
              <span class="name">{{ authState.profile.nickname }}</span>
              <el-icon class="arrow-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="doLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-else class="login-entry" @click="openLogin">
          <el-icon class="unknown-avatar"><User /></el-icon>
          <span class="login-text">未登录</span>
        </div>
      </div>
    </div>

    <!-- 设置用户名对话框 -->
    <el-dialog
      v-model="showUsernameDialog"
      title="设置本机用户名"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form @submit.prevent="handleSetUsername">
        <el-form-item label="用户名" required>
          <el-input
            v-model="newUsername"
            placeholder="请输入用户名（1-20个字符）"
            maxlength="20"
            show-word-limit
            clearable
            @keyup.enter="handleSetUsername"
          />
        </el-form-item>
        <div class="dialog-tip">
          <el-icon><InfoFilled /></el-icon>
          提示：设置用户名后才能点歌，用户名将显示在队列中
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showUsernameDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSetUsername"
          :loading="settingUsername"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 本机用户登录对话框 -->
    <el-dialog
      v-model="showLocalLoginDialog"
      title="本机网易云登录"
      width="450px"
      :close-on-click-modal="false"
    >
      <LocalLoginDialog @success="handleLocalLoginSuccess" @close="showLocalLoginDialog = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Headset, User, Monitor, InfoFilled, ArrowDown, Setting } from '@element-plus/icons-vue'
import { authState, fetchAuthStatus, logout } from '../utils/auth'
import { localAuthState, fetchLocalAuthStatus, localLogout } from '../utils/localAuth'
import api from '../utils/api'
import { ElMessage } from 'element-plus'
import LocalLoginDialog from './LocalLoginDialog.vue'

const route = useRoute()
const router = useRouter()

// 本机用户信息
const localUserInfo = ref({
  ip: '',
  username: '',
  hasUsername: false,
  isHost: false
})
const showUsernameDialog = ref(false)
const newUsername = ref('')
const settingUsername = ref(false)

// 本机用户登录相关
const showLocalLoginDialog = ref(false)

function openLogin() {
  // 通过事件通知 App.vue 打开登录弹窗
  window.dispatchEvent(new CustomEvent('open-login-dialog'))
}

// 打开本机用户登录
function openLocalLogin() {
  showLocalLoginDialog.value = true
}

// 本机用户退出网易云登录
async function doLocalLogout() {
  try {
    await localLogout()
    ElMessage.success('已退出网易云登录')
  } catch (error) {
    ElMessage.error('退出失败')
  }
}

// 本机用户登录成功
function handleLocalLoginSuccess() {
  showLocalLoginDialog.value = false
  fetchLocalAuthStatus()
}

// 退出登录
async function doLogout() {
  try {
    await logout()
    ElMessage.success('已退出登录')
  } catch (error) {
    ElMessage.error('退出失败')
  }
}

// 打开管理页面
function openAdmin() {
  router.push('/admin')
}

// 获取本机用户信息
async function fetchLocalUserInfo() {
  try {
    const result = await api.getUserInfo()
    if (result.success) {
      localUserInfo.value = result.data
      newUsername.value = result.data.username || ''
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 设置用户名
async function handleSetUsername() {
  const username = newUsername.value.trim()
  if (!username) {
    ElMessage.warning('请输入用户名')
    return
  }

  settingUsername.value = true
  try {
    const result = await api.setUsername(username)
    if (result.success) {
      ElMessage.success('用户名设置成功')
      localUserInfo.value.username = username
      localUserInfo.value.hasUsername = true
      showUsernameDialog.value = false
      // 通知其他组件用户信息已更新
      window.dispatchEvent(new CustomEvent('local-user-updated', { detail: localUserInfo.value }))
    } else {
      ElMessage.error(result.error || '设置失败')
    }
  } catch (error) {
    ElMessage.error('设置失败，请检查网络连接')
  } finally {
    settingUsername.value = false
  }
}

onMounted(() => {
  fetchAuthStatus()
  fetchLocalAuthStatus()
  fetchLocalUserInfo()
  window.addEventListener('auth-updated', fetchAuthStatus)
  window.addEventListener('local-auth-updated', fetchLocalAuthStatus)
})
</script>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.left { display: flex; align-items: center; gap: 16px; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 700; cursor: pointer; }
.links :deep(.el-button) { margin-left: 6px; }
.right { display: flex; align-items: center; gap: 12px; }
.login-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}
.login-entry:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #333;
}
.unknown-avatar {
  font-size: 18px;
  color: #999;
}
.login-text {
  font-size: 14px;
}
.user { 
  display: flex; 
  align-items: center; 
}
.user-info-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.user-info-trigger:hover {
  background: rgba(0, 0, 0, 0.05);
}
.avatar { 
  width: 28px; 
  height: 28px; 
  border-radius: 50%; 
  object-fit: cover; 
}
.name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
.arrow-icon {
  font-size: 12px;
  color: #999;
  transition: transform 0.3s;
}
.user-info-trigger:hover .arrow-icon {
  transform: translateY(2px);
}

/* 本机用户信息样式 */
.local-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}
.local-user-info:hover {
  background: rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}
.local-user-icon {
  font-size: 20px;
  color: #667eea;
}
.local-user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.local-user-ip {
  font-size: 11px;
  color: #666;
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}
.host-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #ff6b6b;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe9e9 100%);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #ffcdd2;
}
.local-user-name {
  font-size: 13px;
  color: #333;
  font-weight: 600;
  line-height: 1.2;
}
.local-user-name.no-username {
  color: #ff6b6b;
  font-style: italic;
  font-weight: 500;
}

/* 分隔符样式 */
.divider {
  width: 1px;
  height: 32px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 8px;
}

/* 对话框提示样式 */
.dialog-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f0f7ff;
  border-radius: 8px;
  color: #667eea;
  font-size: 13px;
  margin-top: -10px;
}

/* 本机用户容器样式 */
.local-user-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 本机用户网易云登录状态样式 */
.local-auth-status {
  display: flex;
  align-items: center;
}

.local-auth-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(102, 126, 234, 0.08);
}

.local-auth-trigger:hover {
  background: rgba(102, 126, 234, 0.15);
}

.local-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.local-nickname {
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.local-auth-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.local-auth-entry:hover {
  background: rgba(0, 0, 0, 0.08);
}

.local-auth-icon {
  font-size: 14px;
  color: #999;
}

.local-auth-text {
  font-size: 12px;
  color: #999;
}
</style>


