<template>
  <div class="local-login-dialog">
    <div v-if="!qrData" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在生成二维码...</p>
    </div>

    <div v-else-if="qrData.success" class="qr-container">
      <div class="qr-code">
        <img :src="qrData.qrImg" alt="二维码" />
      </div>
      
      <div class="status-info">
        <div v-if="status === 'waiting'" class="status-waiting">
          <el-icon><Iphone /></el-icon>
          <p>请使用<strong>网易云音乐APP</strong>扫描二维码</p>
          <p class="sub-text">登录后可访问您的喜欢歌单和创建的歌单</p>
        </div>
        <div v-else-if="status === 'scanned'" class="status-scanned">
          <el-icon class="success-icon"><SuccessFilled /></el-icon>
          <p>已扫码，请在手机上确认登录</p>
        </div>
        <div v-else-if="status === 'expired'" class="status-expired">
          <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
          <p>二维码已过期</p>
          <el-button type="primary" @click="refreshQr" :loading="refreshing">刷新二维码</el-button>
        </div>
      </div>

      <div class="remember-me">
        <el-checkbox v-model="rememberMe">记住我（7天免登录）</el-checkbox>
      </div>
    </div>

    <div v-else class="error">
      <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
      <p>生成二维码失败：{{ qrData.error }}</p>
      <el-button type="primary" @click="generateQr">重试</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Loading, Iphone, SuccessFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { createLocalQr, checkLocalQrStatus, fetchLocalAuthStatus } from '../utils/localAuth'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['success', 'close'])

const qrData = ref(null)
const status = ref('waiting') // waiting, scanned, expired, success
const rememberMe = ref(true)
const refreshing = ref(false)
let pollTimer = null

// 生成二维码
async function generateQr() {
  qrData.value = null
  status.value = 'waiting'
  
  try {
    const result = await createLocalQr()
    console.log('✓ 二维码数据:', result)
    qrData.value = result
    
    if (result.success) {
      console.log('✓ 开始轮询检查二维码状态...')
      startPolling()
    } else {
      console.error('✗ 生成二维码失败:', result.error)
    }
  } catch (error) {
    console.error('✗ 生成二维码异常:', error)
    qrData.value = { success: false, error: error.message || '网络错误' }
  }
}

// 刷新二维码
async function refreshQr() {
  refreshing.value = true
  stopPolling()
  await generateQr()
  refreshing.value = false
}

// 开始轮询检查状态
function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  
  pollTimer = setInterval(async () => {
    if (!qrData.value || !qrData.value.key) {
      console.warn('⚠ 缺少二维码key，停止轮询')
      return
    }
    
    try {
      const result = await checkLocalQrStatus(qrData.value.key, rememberMe.value)
      console.log('📱 二维码状态检查结果:', result)
      
      if (result.status === 'success') {
        console.log('✓ 登录成功！')
        status.value = 'success'
        stopPolling()
        ElMessage.success('登录成功！')
        
        // 更新本机登录状态
        await fetchLocalAuthStatus()
        
        // 触发成功事件
        window.dispatchEvent(new CustomEvent('local-auth-updated'))
        emit('success')
        emit('close')
      } else if (result.status === 'scanned') {
        console.log('📱 已扫码，等待确认...')
        status.value = 'scanned'
      } else if (result.status === 'expired') {
        console.log('⏰ 二维码已过期')
        status.value = 'expired'
        stopPolling()
      } else if (result.status === 'waiting') {
        console.log('⏳ 等待扫码...')
      } else {
        console.warn('⚠ 未知状态:', result)
      }
    } catch (error) {
      console.error('✗ 检查二维码状态异常:', error)
    }
  }, 3000) // 每3秒检查一次
}

// 停止轮询
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  generateQr()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.local-login-dialog {
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
  min-height: 80px;
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

.status-waiting .sub-text {
  font-size: 13px;
  color: #999;
  margin-top: -8px;
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
