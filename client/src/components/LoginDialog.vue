<template>
  <el-dialog 
    v-model="visible" 
    title="登录网易云音乐" 
    width="450px" 
    :close-on-click-modal="false"
    :append-to-body="true"
    :center="true"
    align-center
  >
    <div class="login-dialog">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <p>正在生成二维码...</p>
      </div>

      <div v-else-if="qrImg" class="qr-container">
        <div class="qr-code">
          <img :src="qrImg" alt="二维码" />
        </div>
        
        <div class="status-info">
          <div v-if="status === 'waiting'" class="status-waiting">
            <el-icon><Iphone /></el-icon>
            <p>请使用<strong>网易云音乐APP</strong>扫描二维码</p>
            <p class="countdown-text" v-if="countdown > 0">二维码将在 <span class="countdown-num">{{ countdown }}s</span> 后过期</p>
            <p class="countdown-text expired" v-else>二维码已过期</p>
          </div>
          <div v-else-if="status === 'scanned'" class="status-scanned">
            <el-icon class="success-icon"><SuccessFilled /></el-icon>
            <p>已扫码，请在手机上确认登录</p>
          </div>
          <div v-else-if="status === 'expired'" class="status-expired">
            <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
            <p>二维码已过期</p>
            <el-button type="primary" @click="refreshQr" :loading="loading">刷新二维码</el-button>
          </div>
        </div>

        <div class="remember-me">
          <el-checkbox v-model="rememberMe">记住我（7天免登录）</el-checkbox>
        </div>
      </div>

      <div v-else class="error">
        <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
        <p>生成二维码失败</p>
        <el-button type="primary" @click="refreshQr">重试</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Iphone, SuccessFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { createQr, checkQrStatus } from '../utils/auth'

const visible = ref(false)
const loading = ref(false)
const qrKey = ref('')
const qrImg = ref('')
const timer = ref(null)
const poller = ref(null)
const countdown = ref(120)
const rememberMe = ref(true)
const status = ref('waiting') // waiting, scanned, expired

const open = async () => {
  visible.value = true
  await refreshQr()
}

const close = () => {
  visible.value = false
  stopTimers()
}

const startCountdown = () => {
  countdown.value = 120
  timer.value = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(timer.value)
      timer.value = null
    }
  }, 1000)
}

const startPolling = () => {
  poller.value = setInterval(async () => {
    if (!qrKey.value) return
    try {
      const res = await checkQrStatus(qrKey.value, rememberMe.value)
      
      if (res.status === 'success') {
        status.value = 'success'
        stopTimers()
        ElMessage.success('登录成功！')
        close()
        // 刷新页面状态
        window.dispatchEvent(new CustomEvent('auth-updated'))
      } else if (res.status === 'scanned') {
        status.value = 'scanned'
      } else if (res.status === 'expired') {
        status.value = 'expired'
        stopTimers()
      } else if (res.status === 'waiting') {
        status.value = 'waiting'
      }
    } catch (e) {
      console.error('检查二维码状态失败:', e)
    }
  }, 3000)
}

const stopTimers = () => {
  if (timer.value) { clearInterval(timer.value); timer.value = null }
  if (poller.value) { clearInterval(poller.value); poller.value = null }
}

const refreshQr = async () => {
  stopTimers()
  loading.value = true
  status.value = 'waiting'
  try {
    const res = await createQr()
    if (res?.success) {
      qrKey.value = res.key
      qrImg.value = res.qrImg
      startCountdown()
      startPolling()
    } else {
      ElMessage.error(res?.error || '获取二维码失败')
    }
  } catch (e) {
    ElMessage.error('网络错误，获取二维码失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
onUnmounted(stopTimers)
</script>

<style scoped>
.login-dialog {
  padding: 20px 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #666;
}

.loading .el-icon {
  font-size: 40px;
  margin-bottom: 16px;
  color: #409eff;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.qr-code {
  width: 200px;
  height: 200px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.status-info {
  text-align: center;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-waiting,
.status-scanned,
.status-expired {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.status-waiting .el-icon {
  font-size: 36px;
  color: #409eff;
}

.status-waiting p {
  margin: 0;
  font-size: 15px;
  color: #333;
}

.status-waiting .countdown-text {
  font-size: 13px;
  color: #666;
  margin-top: -8px;
}

.status-waiting .countdown-num {
  color: #409eff;
  font-weight: 600;
}

.status-waiting .countdown-text.expired {
  color: #e6a23c;
  font-weight: 500;
}

.status-scanned {
  color: #67c23a;
}

.status-scanned .success-icon {
  font-size: 40px;
}

.status-scanned p {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}

.status-expired {
  color: #f56c6c;
}

.status-expired .error-icon {
  font-size: 40px;
}

.status-expired p {
  margin: 0 0 12px 0;
  font-size: 15px;
}

.remember-me {
  width: 100%;
  padding: 16px 0 0 0;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: center;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
  color: #f56c6c;
}

.error .error-icon {
  font-size: 48px;
}

.error p {
  margin: 0;
  font-size: 14px;
}
</style>

<style>
/* 确保弹窗在页面中央显示，不受父组件影响 */
.el-dialog__wrapper {
  z-index: 2000 !important;
}
</style>


