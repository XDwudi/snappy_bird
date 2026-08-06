// pages/index/index.js - 主界面逻辑
const Storage = require('../../utils/Storage.js')

Page({
  data: {
    bestScore: 0,
    version: '1.0.0'
  },

  onShow() {
    // 每次显示时刷新最高分（从游戏返回时也需要更新）
    this.setData({
      bestScore: Storage.getBestScore()
    })
  },

  onStart() {
    wx.navigateTo({
      url: '/pages/game/game'
    })
  }
})
