<template>
  <div id="app">
    <NavBar />
    <router-view />
    <LoginDialog ref="loginDialogRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import NavBar from './components/NavBar.vue'
import LoginDialog from './components/LoginDialog.vue'

const loginDialogRef = ref(null)

function handleOpenLogin() {
  loginDialogRef.value?.open()
}

onMounted(() => {
  window.addEventListener('open-login-dialog', handleOpenLogin)
})

onUnmounted(() => {
  window.removeEventListener('open-login-dialog', handleOpenLogin)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}
</style>

