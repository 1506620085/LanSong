<template>
  <el-dialog v-model="visible" title="登录网易云音乐" width="420px" :close-on-click-modal="false">
    <div v-if="loading" class="center">
      <el-icon class="spin"><Loading /></el-icon>
      <div class="hint">正在生成二维码...</div>
    </div>
    <div v-else>
      <div class="qr-wrap" v-if="qrImg">
        <img :src="qrImg" class="qr" />
      </div>
      <div class="status">
        <span v-if="countdown > 0">二维码将在 {{ countdown }}s 后过期</span>
        <span v-else class="warn">二维码已过期</span>
      </div>
      <div class="actions">
        <el-button @click="refreshQr" :loading="loading">重新生成</el-button>
        <el-button type="primary" @click="close">关闭</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { createQr, checkQrStatus } from '../utils/auth'

const visible = ref(false)
const loading = ref(false)
const qrKey = ref('')
const qrImg = ref('')
const timer = ref(null)
const poller = ref(null)
const countdown = ref(120)

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
      const res = await checkQrStatus(qrKey.value)
      if (res.status === 'success') {
        ElMessage.success('登录成功')
        close()
        // 刷新页面状态
        window.dispatchEvent(new CustomEvent('auth-updated'))
      } else if (res.status === 'expired') {
        ElMessage.warning('二维码已过期，请重新生成')
        stopTimers()
      }
    } catch (e) {
      // ignore
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
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
}
.spin { animation: spin 1s linear infinite; font-size: 32px; }
@keyframes spin { to { transform: rotate(360deg); } }
.qr-wrap { display: flex; justify-content: center; }
.qr { width: 260px; height: 260px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.status { text-align: center; margin: 10px 0; color: #666; }
.status .warn { color: #e6a23c; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
</style>


