/**
 * Storage.js - 本地存档管理
 * 
 * 封装微信本地缓存，管理最高分、累计金币等持久化数据。
 */

const KEY_BEST_SCORE = 'snappy_best_score'
const KEY_TOTAL_COINS = 'snappy_total_coins'
const KEY_UNLOCKED_SKINS = 'snappy_unlocked_skins'

module.exports = {
  /**
   * 获取最高分
   * @returns {number}
   */
  getBestScore() {
    try {
      return wx.getStorageSync(KEY_BEST_SCORE) || 0
    } catch (e) {
      return 0
    }
  },

  /**
   * 保存最高分
   * @param {number} score
   */
  saveBestScore(score) {
    try {
      wx.setStorageSync(KEY_BEST_SCORE, score)
    } catch (e) {
      console.error('保存最高分失败:', e)
    }
  },

  /**
   * 获取累计金币
   * @returns {number}
   */
  getTotalCoins() {
    try {
      return wx.getStorageSync(KEY_TOTAL_COINS) || 0
    } catch (e) {
      return 0
    }
  },

  /**
   * 保存累计金币
   * @param {number} coins
   */
  saveTotalCoins(coins) {
    try {
      wx.setStorageSync(KEY_TOTAL_COINS, coins)
    } catch (e) {
      console.error('保存金币失败:', e)
    }
  },

  /**
   * 增加金币
   * @param {number} amount
   * @returns {number} 更新后的总金币
   */
  addCoins(amount) {
    const total = this.getTotalCoins() + amount
    this.saveTotalCoins(total)
    return total
  },

  /**
   * 获取已解锁皮肤列表
   * @returns {string[]}
   */
  getUnlockedSkins() {
    try {
      return wx.getStorageSync(KEY_UNLOCKED_SKINS) || ['default']
    } catch (e) {
      return ['default']
    }
  },

  /**
   * 解锁皮肤
   * @param {string} skinId
   */
  unlockSkin(skinId) {
    const skins = this.getUnlockedSkins()
    if (skins.indexOf(skinId) === -1) {
      skins.push(skinId)
      try {
        wx.setStorageSync(KEY_UNLOCKED_SKINS, skins)
      } catch (e) {
        console.error('保存皮肤失败:', e)
      }
    }
  }
}
