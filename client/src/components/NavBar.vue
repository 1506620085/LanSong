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
        <div class="local-user-info">
          <el-icon class="local-user-icon"><Monitor /></el-icon>
          <div class="local-user-details">
            <span class="local-user-ip">{{ localUserInfo.ip || '获取中...' }}</span>
            <span class="local-user-name" @click="showUsernameDialog = true" :class="{ 'no-username': !localUserInfo.username }">
              {{ localUserInfo.username || '点击设置用户名' }}
            </span>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Headset, User, Monitor, InfoFilled, ArrowDown } from '@element-plus/icons-vue'
import { authState, fetchAuthStatus, logout } from '../utils/auth'
import api from '../utils/api'
import { ElMessage } from 'element-plus'

const route = useRoute()

// 本机用户信息
const localUserInfo = ref({
  ip: '',
  username: '',
  hasUsername: false
})
const showUsernameDialog = ref(false)
const newUsername = ref('')
const settingUsername = ref(false)

function openLogin() {
  // 通过事件通知 App.vue 打开登录弹窗
  window.dispatchEvent(new CustomEvent('open-login-dialog'))
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
  fetchLocalUserInfo()
  window.addEventListener('auth-updated', fetchAuthStatus)
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
}
.local-user-info:hover {
  background: rgba(102, 126, 234, 0.12);
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
}
.local-user-name {
  font-size: 13px;
  color: #333;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
  line-height: 1.2;
}
.local-user-name:hover {
  color: #667eea;
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
</style>


