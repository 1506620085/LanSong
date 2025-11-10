<template>
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
      <div v-if="authState.isLoggedIn && authState.profile" class="user" @click="menuVisible=true">
        <img :src="authState.profile.avatarUrl + '?param=40y40'" class="avatar" />
        <span class="name">{{ authState.profile.nickname }}</span>
        <el-dropdown v-model:visible="menuVisible" trigger="click">
          <span class="dropdown-trigger"></span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="refresh">刷新资料</el-dropdown-item>
              <el-dropdown-item divided @click="doLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div v-else class="login-entry" @click="openLogin">
        未登录
      </div>
    </div>
    <LoginDialog ref="loginRef" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Headset } from '@element-plus/icons-vue'
import { authState, fetchAuthStatus, logout } from '../utils/auth'
import LoginDialog from './LoginDialog.vue'

const route = useRoute()
const loginRef = ref(null)
const menuVisible = ref(false)

function openLogin() {
  loginRef.value?.open()
}

async function refresh() {
  await fetchAuthStatus()
}

async function doLogout() {
  await logout()
}

onMounted(() => {
  fetchAuthStatus()
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
.login-entry { color: #666; cursor: pointer; }
.user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.dropdown-trigger { display: inline-block; width: 1px; height: 1px; }
</style>


