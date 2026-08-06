/**
 * ExpSystem.js - 经验与升级系统
 *
 * 职责：经验值管理、等级计算、升级阈值、进度查询。
 * 升级触发后通知 Game.js 暂停游戏并弹出选择面板。
 */

const Config = require('../config/GameConfig.js')

class ExpSystem {
  constructor() {
    this.reset()
  }

  reset() {
    this.exp = 0
    this.level = 1
    this.pendingLevelUps = 0  // 待处理的升级次数（一次获得大量经验可能跨级）
  }

  /**
   * 计算升到下一级所需经验
   * 公式：BASE_EXP + (level - 1) * EXP_INCREMENT
   * @param {number} level - 当前等级
   * @returns {number}
   */
  getExpNeeded(level) {
    return Config.EXP.BASE_EXP + (level - 1) * Config.EXP.EXP_INCREMENT
  }

  /**
   * 添加经验
   * @param {number} amount - 基础经验值（未乘倍率）
   * @param {number} multiplier - 经验倍率
   * @returns {number} 实际增加的经验
   */
  addExp(amount, multiplier) {
    const actual = Math.round(amount * multiplier)
    this.exp += actual

    // 检查升级
    while (this.exp >= this.getExpNeeded(this.level)) {
      this.exp -= this.getExpNeeded(this.level)
      this.level++
      this.pendingLevelUps++
    }

    return actual
  }

  /**
   * 消费一个待处理升级
   * @returns {boolean} 是否有升级待处理
   */
  consumeLevelUp() {
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--
      return true
    }
    return false
  }

  /**
   * 是否有待处理的升级
   */
  hasPendingLevelUp() {
    return this.pendingLevelUps > 0
  }

  /**
   * 获取经验条进度（0~1）
   */
  getProgress() {
    const needed = this.getExpNeeded(this.level)
    return Math.min(this.exp / needed, 1)
  }

  /**
   * 获取经验条显示数据
   */
  getExpBarData() {
    const needed = this.getExpNeeded(this.level)
    return {
      level: this.level,
      current: this.exp,
      needed: needed,
      progress: this.exp / needed
    }
  }
}

module.exports = ExpSystem
