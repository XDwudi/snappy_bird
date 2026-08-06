/**
 * AbilitySystem.js - 能力系统核心
 *
 * 职责：
 * - 管理当前已拥有的能力（id → level）
 * - 提供计算后的属性修饰器给 Game.js 读取
 * - 管理主动技能冷却计时
 * - 护盾/复活/无敌等状态管理
 */

const Config = require('../config/GameConfig.js')
const Registry = require('../abilities/AbilityRegistry.js')

class AbilitySystem {
  constructor() {
    this.reset()
  }

  /**
   * 重置到初始状态（新局开始）
   */
  reset() {
    this.owned = new Map()          // id → level
    this.level = 1                   // 玩家等级

    // 护盾系统
    this.shields = 0                 // 当前护盾数
    this.shieldRecoverTimer = 0      // 护盾恢复计时器（帧）
    this.maxShields = 0              // 最大护盾上限（由坚韧能力决定）

    // 主动技能冷却（帧数，0=可用）
    this.timeWarpCD = 0
    this.teleportCD = 0
    this.shieldBurstTimer = 0        // 护盾爆发计时器

    // 主动技能状态
    this.timeWarpActive = 0          // 时间扭曲剩余帧
    this.phoenixUsed = false         // 凤凰是否已用

    // 连击系统
    this.comboCount = 0              // 连续通过管道数
    this.invincibleFrames = 0        // 无敌剩余帧

    // 全属性加成（所有能力满级后触发）
    this.allBuffLevel = 0
  }

  // ==================== 能力选择 ====================

  /**
   * 升级时获取可选能力列表
   * @returns {Object[]} 能力定义数组
   */
  getChoices() {
    let count = Config.ABILITY.CHOICE_COUNT + this.getStat('bonusChoices')

    // 检查是否所有能力都已满级
    const allMaxed = Registry.getAll().every(ab => {
      const lv = this.owned.get(ab.id) || 0
      return lv >= ab.maxLevel
    })

    if (allMaxed) {
      // 全满级 → 返回空数组，由调用方处理为全属性加成
      return []
    }

    return Registry.rollChoices(this.owned, count)
  }

  /**
   * 选择一个能力（升级）
   * @param {string} id - 能力ID
   */
  selectAbility(id) {
    const def = Registry.get(id)
    if (!def) return

    const currentLevel = this.owned.get(id) || 0
    if (currentLevel >= def.maxLevel) return

    this.owned.set(id, currentLevel + 1)

    // 坚韧能力 → 增加护盾上限
    if (id === 'toughness') {
      this.maxShields = (this.owned.get('toughness') || 0)
      this.shields = Math.min(this.shields + 1, this.maxShields)
    }

    // 护盾爆发 → 初始化计时器
    if (id === 'shield_burst') {
      this.shieldBurstTimer = this._getShieldBurstCD()
    }

    // 凤凰 → 标记可用
    if (id === 'phoenix') {
      this.phoenixUsed = false
    }
  }

  /**
   * 全属性加成（所有能力满级时）
   */
  selectAllBuff() {
    this.allBuffLevel = Math.min(this.allBuffLevel + 1, Config.ABILITY.MAX_ALL_BUFF_LEVEL)
  }

  // ==================== 属性计算 ====================

  /**
   * 获取某个计算属性值
   * 这是一个便捷方法，内部调用 getStats() 缓存
   * @param {string} key
   * @returns {number|boolean}
   */
  getStat(key) {
    if (!this._statsCache) {
      this._statsCache = this.getStats()
    }
    return this._statsCache[key]
  }

  /**
   * 根据已拥有的能力计算全部属性修饰器
   * 每帧调用前需要 invalidateStats()
   */
  getStats() {
    const s = {
      gravityMultiplier: 1.0,
      flapForceMultiplier: 1.0,
      collisionScale: 1.0,
      expMultiplier: 1.0,
      orbAttractRange: Config.ORB.ATTRACT_RANGE,
      scrollSpeedMultiplier: 1.0,
      scoreMultiplier: 1,
      bonusChoices: 0,
      comboThreshold: 5,
      gapBonus: 0,

      // 主动技能 CD（0 = 未拥有）
      hasTimeWarp: false,
      hasTeleport: false,
      hasShieldBurst: false,
      hasPhoenix: false,
    }

    const lv = (id) => this.owned.get(id) || 0
    const allBuff = this.allBuffLevel
    const buffMul = 1 + 0.05 * allBuff

    // 轻羽: 重力 -8%/级
    s.gravityMultiplier = (1 - 0.08 * lv('light_feather')) * buffMul

    // 顺风: 上升力 +10%/级
    s.flapForceMultiplier = (1 + 0.10 * lv('tailwind')) * buffMul

    // 灵巧: 碰撞箱 -12%/级
    s.collisionScale = Math.max(0.3, 1 - 0.12 * lv('agile'))

    // 磁吸: 经验球吸引范围 +50px/级
    s.orbAttractRange = Config.ORB.ATTRACT_RANGE + 50 * lv('magnet')

    // 贪婪: 经验获取 +25%/级
    s.expMultiplier = (1 + 0.25 * lv('greed')) * buffMul

    // 慢速世界: 障碍速度 -10%/级
    s.scrollSpeedMultiplier = Math.max(0.5, 1 - 0.10 * lv('slow_world'))

    // 双倍积分: 管道得分 ×(1+级)
    s.scoreMultiplier = (1 + lv('double_score')) * buffMul

    // 幸运光环: 选项 +1/级
    s.bonusChoices = lv('lucky')

    // 连击之心: 阈值 -2/级
    s.comboThreshold = 5 - 2 * lv('combo_heart')

    // 缩小射线: 间隙 +15px/级
    s.gapBonus = 15 * lv('shrink_ray')

    // 主动技能
    s.hasTimeWarp = lv('time_warp') > 0
    s.hasTeleport = lv('teleport') > 0
    s.hasShieldBurst = lv('shield_burst') > 0
    s.hasPhoenix = lv('phoenix') > 0 && !this.phoenixUsed

    return s
  }

  /**
   * 清除属性缓存（能力变化后调用）
   */
  invalidateStats() {
    this._statsCache = null
  }

  // ==================== 主动技能 CD ====================

  /**
   * 每帧更新冷却计时
   */
  tickCooldowns() {
    if (this.timeWarpCD > 0) this.timeWarpCD--
    if (this.teleportCD > 0) this.teleportCD--
    if (this.timeWarpActive > 0) this.timeWarpActive--

    // 护盾爆发计时
    if (this.hasStat('hasShieldBurst')) {
      this.shieldBurstTimer--
      if (this.shieldBurstTimer <= 0) {
        this.shields = Math.min(this.shields + 1, Math.max(this.maxShields, 1))
        this.shieldBurstTimer = this._getShieldBurstCD()
      }
    }

    // 护盾恢复（坚韧能力）
    if (this.maxShields > 0 && this.shields < this.maxShields) {
      this.shieldRecoverTimer++
      if (this.shieldRecoverTimer >= 1800) { // 30s = 1800帧
        this.shields = Math.min(this.shields + 1, this.maxShields)
        this.shieldRecoverTimer = 0
      }
    }

    // 无敌帧
    if (this.invincibleFrames > 0) this.invincibleFrames--
  }

  /**
   * 时间扭曲 CD（秒→帧）
   */
  _getTimeWarpCD() {
    const lv = this.owned.get('time_warp') || 0
    return (20 - 3 * (lv - 1)) * 60
  }

  /**
   * 瞬移 CD
   */
  _getTeleportCD() {
    const lv = this.owned.get('teleport') || 0
    return (30 - 5 * (lv - 1)) * 60
  }

  /**
   * 护盾爆发 CD
   */
  _getShieldBurstCD() {
    const lv = this.owned.get('shield_burst') || 0
    return (25 - 3 * (lv - 1)) * 60
  }

  // ==================== 护盾系统 ====================

  /**
   * 消耗一层护盾
   * @returns {boolean} 是否成功消耗
   */
  consumeShield() {
    if (this.shields > 0) {
      this.shields--
      this.shieldRecoverTimer = 0
      return true
    }
    return false
  }

  /**
   * 当前是否有护盾或无敌
   */
  hasProtection() {
    return this.shields > 0 || this.invincibleFrames > 0 || this.timeWarpActive > 0
  }

  // ==================== 连击系统 ====================

  /**
   * 通过管道时调用
   */
  onPipePass() {
    this.comboCount++
    if (this.comboCount >= this.getStat('comboThreshold')) {
      this.invincibleFrames = 300 // 5s = 300帧
      this.comboCount = 0
    }
  }

  /**
   * 碰撞时重置连击
   */
  resetCombo() {
    this.comboCount = 0
  }

  // ==================== 主动技能触发 ====================

  /**
   * 尝试触发时间扭曲（即将碰撞时）
   * @returns {boolean} 是否触发
   */
  tryTimeWarp() {
    if (!this.getStat('hasTimeWarp') || this.timeWarpCD > 0) return false
    this.timeWarpCD = this._getTimeWarpCD()
    this.timeWarpActive = 60 // 1s = 60帧
    return true
  }

  /**
   * 尝试触发瞬移闪避
   * @returns {boolean} 是否触发
   */
  tryTeleport() {
    if (!this.getStat('hasTeleport') || this.teleportCD > 0) return false
    this.teleportCD = this._getTeleportCD()
    return true
  }

  /**
   * 尝试使用凤凰复活
   * @returns {boolean} 是否触发
   */
  tryPhoenix() {
    if (!this.getStat('hasPhoenix')) return false
    this.phoenixUsed = true
    this.invalidateStats()
    return true
  }

  // ==================== 工具 ====================

  hasStat(key) {
    if (!this._statsCache) {
      this._statsCache = this.getStats()
    }
    return !!this._statsCache[key]
  }

  /**
   * 获取已拥有能力列表（供UI显示）
   * @returns {Array<{def: Object, level: number}>}
   */
  getOwnedList() {
    const list = []
    for (const [id, level] of this.owned) {
      list.push({ def: Registry.get(id), level })
    }
    return list
  }
}

module.exports = AbilitySystem
