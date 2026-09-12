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

    // [v1.4.0] 经验银行（exp_bank）：由 Game 根据持卡情况调用 configureBank 同步
    this.bankEnabled = false   // 是否持有经验银行
    this.bankBalance = 0       // 银行余额
    this.bankRate = 0          // 每 10s 生息比例（0.05/级）
    this.lastBankDeposit = 0   // 最近一次 addExp 存入银行的量（Game 取走后清零）
    this.lastBankWithdraw = 0  // 最近一次升级时银行转入经验池的量
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
   * [v1.4.0] 经验银行分叉：单次获得超出「当前升级所需 ×1.5」的部分存入银行（不直接进经验条）；
   *           银行上限 = 当前升级所需 ×2，超限部分自动入池；每次升级时银行全额转入经验池
   *           （双刹车：上限 ×2 + 升级即全额取出，杜绝"只存不花"憋利邪道）
   * @param {number} amount - 基础经验值（未乘倍率）
   * @param {number} multiplier - 经验倍率
   * @returns {number} 实际增加的经验
   */
  addExp(amount, multiplier) {
    let actual = Math.round(amount * multiplier)
    this.lastBankDeposit = 0
    this.lastBankWithdraw = 0

    if (this.bankEnabled && actual > 0) {
      const BANK = Config.EXP.BANK
      const needed = this.getExpNeeded(this.level)
      const directCap = Math.ceil(needed * BANK.DIRECT_CAP_RATIO)
      if (actual > directCap) {
        let overflow = actual - directCap
        actual = directCap
        const room = Math.max(0, needed * BANK.CAP_RATIO - this.bankBalance)
        const deposit = Math.min(overflow, room)
        this.bankBalance += deposit
        this.lastBankDeposit = deposit
        actual += (overflow - deposit)  // 超限部分自动入池
      }
    }

    this.exp += actual

    // 检查升级
    while (this.exp >= this.getExpNeeded(this.level)) {
      this.exp -= this.getExpNeeded(this.level)
      this.level++
      this.pendingLevelUps++
      // [v1.4.0] 升级瞬间银行"连本带利"全额取出（可能继续跨级，由 while 循环处理）
      if (this.bankEnabled && this.bankBalance > 0) {
        this.exp += this.bankBalance
        this.lastBankWithdraw += this.bankBalance
        this.bankBalance = 0
      }
    }

    return actual
  }

  /**
   * [v1.4.0] 经验银行生息：由 Game 按 10s 周期调用（对齐 WEATHER.CHECK_INTERVAL 节奏，
   *           不新增逐帧计时器）；余额封顶 = 当前升级所需 ×2
   * @returns {number} 本次实际生息量（0=未生息）
   */
  tickBankInterest() {
    if (!this.bankEnabled || this.bankBalance <= 0 || this.bankRate <= 0) return 0
    const cap = this.getExpNeeded(this.level) * Config.EXP.BANK.CAP_RATIO
    const added = Math.min(Math.round(this.bankBalance * this.bankRate), Math.max(0, cap - this.bankBalance))
    if (added <= 0) return 0
    this.bankBalance += added
    return added
  }

  /**
   * [v1.4.0] 同步经验银行开关与生息率（由 Game 在选卡后调用）
   * @param {number} lv - 经验银行等级（0=未持有）
   */
  configureBank(lv) {
    this.bankEnabled = lv > 0
    this.bankRate = Config.EXP.BANK.INTEREST_PER_LV * lv
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
