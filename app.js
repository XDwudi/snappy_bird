// app.js - 小程序入口
const Storage = require('./utils/Storage.js')

App({
  globalData: {
    bestScore: 0,
    totalCoins: 0
  },

  onLaunch() {
    // 加载本地存档
    this.globalData.bestScore = Storage.getBestScore()
    this.globalData.totalCoins = Storage.getTotalCoins()
  }
})
