import { createRouter, createWebHistory } from 'vue-router'
import Request from '../views/Request.vue'
import Player from '../views/Player.vue'

const routes = [
  {
    path: '/',
    name: 'Request',
    component: Request,
    meta: { title: '点歌' }
  },
  {
    path: '/player',
    name: 'Player',
    component: Player,
    meta: { title: '播放器' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '音乐'} - 局域网点歌系统`
  next()
})

export default router

