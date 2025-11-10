// 播放队列管理模块
class PlayQueue {
  constructor() {
    this.queue = []; // 播放队列
    this.currentIndex = -1; // 当前播放的索引
    this.currentSong = null; // 当前播放的歌曲
    this.history = []; // 播放历史
  }

  // 添加歌曲到队列
  addSong(song) {
    const newSong = {
      ...song,
      queueId: Date.now() + Math.random(), // 唯一标识
      addTime: new Date().toISOString(),
      played: false
    };
    this.queue.push(newSong);
    console.log(`✓ 添加歌曲到队列: ${song.name}`);
    return newSong;
  }

  // 批量添加歌曲
  addSongs(songs) {
    return songs.map(song => this.addSong(song));
  }

  // 删除队列中的歌曲
  removeSong(queueId) {
    const index = this.queue.findIndex(s => s.queueId === queueId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      // 如果删除的歌曲在当前播放之前，需要调整currentIndex
      if (index <= this.currentIndex) {
        this.currentIndex--;
      }
      console.log(`✓ 从队列删除歌曲: ${removed.name}`);
      return { success: true, removed };
    }
    return { success: false, error: '歌曲不存在' };
  }

  // 获取队列列表
  getQueue() {
    return this.queue;
  }

  // 获取当前播放的歌曲
  getCurrentSong() {
    return this.currentSong;
  }

  // 播放下一首
  playNext() {
    if (this.queue.length === 0) {
      this.currentSong = null;
      this.currentIndex = -1;
      return null;
    }

    // 如果当前有歌曲，标记为已播放并加入历史
    if (this.currentSong) {
      this.currentSong.played = true;
      this.history.push(this.currentSong);
      // 从队列中移除已播放的歌曲
      if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
        this.queue.splice(this.currentIndex, 1);
        // 不增加 currentIndex，因为删除后下一首的索引就是当前位置
      }
    }

    // 播放队列中的第一首（因为已播放的被删除了）
    if (this.queue.length > 0) {
      this.currentIndex = 0;
      this.currentSong = this.queue[0];
      console.log(`▶ 播放歌曲: ${this.currentSong.name}`);
      return this.currentSong;
    } else {
      this.currentSong = null;
      this.currentIndex = -1;
      return null;
    }
  }

  // 播放上一首（从历史记录）
  playPrevious() {
    if (this.history.length === 0) {
      return null;
    }

    // 把当前歌曲放回队列开头
    if (this.currentSong) {
      this.queue.unshift(this.currentSong);
    }

    // 从历史中取出最后一首
    this.currentSong = this.history.pop();
    this.currentSong.played = false;
    
    // 把这首歌放回队列开头
    this.queue.unshift(this.currentSong);
    this.currentIndex = 0;

    console.log(`◀ 播放上一首: ${this.currentSong.name}`);
    return this.currentSong;
  }

  // 清空队列
  clear() {
    this.queue = [];
    this.currentIndex = -1;
    this.currentSong = null;
    console.log('✓ 队列已清空');
  }

  // 获取播放历史
  getHistory() {
    return this.history;
  }

  // 获取队列状态
  getState() {
    return {
      queue: this.queue,
      currentSong: this.currentSong,
      currentIndex: this.currentIndex,
      queueLength: this.queue.length,
      historyLength: this.history.length
    };
  }

  // 移动歌曲位置（拖拽排序）
  moveSong(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.queue.length ||
        toIndex < 0 || toIndex >= this.queue.length) {
      return { success: false, error: '索引越界' };
    }

    const [song] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, song);

    // 调整 currentIndex
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }

    return { success: true, queue: this.queue };
  }
}

module.exports = new PlayQueue();

