import { reactive } from 'vue'
import api from './api'

// 本机用户的网易云登录状态（区别于全局主机登录）
export const localAuthState = reactive({
  isLoggedIn: false,
  profile: null, // { nickname, avatarUrl, userId }
})

// 获取本机用户的登录状态
export async function fetchLocalAuthStatus() {
  try {
    const res = await api.getLocalAuthStatus()
    if (res?.success) {
      localAuthState.isLoggedIn = !!res.isLoggedIn
      localAuthState.profile = res.profile || null
    }
  } catch (e) {
    console.error('获取本机登录状态失败:', e)
  }
}

// 本机用户退出登录
export async function localLogout() {
  try {
    await api.localLogout()
  } finally {
    localAuthState.isLoggedIn = false
    localAuthState.profile = null
  }
}

// 创建本机用户登录二维码
export async function createLocalQr() {
  return api.createLocalAuthQr()
}

// 检查本机用户二维码状态
export async function checkLocalQrStatus(key, rememberMe = false) {
  return api.checkLocalAuthQr(key, rememberMe)
}
