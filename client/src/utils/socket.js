import { io } from 'socket.io-client'

const isDev = import.meta.env.DEV
const socketURL = isDev ? 'http://localhost:3000' : window.location.origin

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = {}
  }

  connect() {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(socketURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    })

    this.socket.on('connect', () => {
      console.log('✓ WebSocket 连接成功')
    })

    this.socket.on('disconnect', () => {
      console.log('✗ WebSocket 连接断开')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not connected')
      return
    }
    this.socket.on(event, callback)
  }

  off(event, callback) {
    if (!this.socket) {
      return
    }
    if (callback) {
      this.socket.off(event, callback)
    } else {
      this.socket.off(event)
    }
  }

  emit(event, data) {
    if (!this.socket) {
      console.warn('Socket not connected')
      return
    }
    this.socket.emit(event, data)
  }
}

export default new SocketService()

