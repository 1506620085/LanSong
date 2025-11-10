import { reactive } from 'vue'
import api from './api'

export const authState = reactive({
  isLoggedIn: false,
  profile: null, // { nickname, avatarUrl, userId }
})

export async function fetchAuthStatus() {
  try {
    const res = await api.getAuthStatus()
    if (res?.success) {
      authState.isLoggedIn = !!res.isLoggedIn
      authState.profile = res.profile || null
    }
  } catch (e) {
    // ignore
  }
}

export async function logout() {
  try {
    await api.logout()
  } finally {
    authState.isLoggedIn = false
    authState.profile = null
  }
}

export async function createQr() {
  return api.createAuthQr()
}

export async function checkQrStatus(key) {
  return api.checkAuthQr(key)
}


