/**
 * AbilitySystem.js - 能力系统核心 [v1.2.0]
 *
 * 职责：
 * - 管理已拥有的能力（id → level）
 * - 提供计算后的属性修饰器给 Game.js 读取
 * - 管理 HP / 最大HP / 受击无敌
 * - [v1.1.5] 统一护盾系统：shieldLayers(当前层数) / maxShieldLayers(最大层数)
 * - 管理主动技能冷却（时间扭曲/瞬移/护盾爆发/自愈/弹力护盾/二段跳/冰晶护体）
 * - 管理道具效果状态（速度包减速）
 * - 连击系统 / 经验共鸣 / 狂暴
 * - [v1.2.0] 风暴之子：环境效果期间全属性提升
 */

const Config = require('../config/GameConfig.js')
const Registry = require('../abilities/AbilityRegistry.js')
const Logger = require('./GameLogger.js')

class AbilitySystem {
  constructor() {
    this.reset()
  }

  /**
   * 重置到初始状态（新局开始）
   */
  reset() {
    this.owned = new Map()          // id → level

    // [v1.1.0] HP系统
    this.hp = Config.HP.INITIAL
    this.maxHp = Config.HP.INITIAL_MAX

    // [v1.1.5] 统一护盾系统
    this.shieldLayers = 0                    // 当前护盾层数
    this.maxShieldLayers = Config.SHIELD.DEFAULT_MAX_LAYERS  // 最大护盾层数(默认1)
    this.shieldRecoverTimer = 0              // 坚韧护盾恢复计时器
    this.bounceShieldRecoverTimer = 0        // 弹力护盾恢复计时器

    // 主动技能冷却
    this.timeWarpCD = 0
    this.teleportCD = 0
    this.shieldBurstTimer = 0
    this.regenerationTimer = 0      // [v1.1.0] 自愈计时器
    this.doubleJumpCD = 0           // [v1.1.0] 二段跳CD
    this.lastFlapFrame = -999       // [v1.1.0] 上次拍翅帧（二段跳检测）
    this.iceCrystalCD = 0           // [v1.2.0] 冰晶护体CD

    // 主动技能状态
    this.timeWarpActive = 0
    this.phoenixUsed = 0            // [v1.1.0] 改为计数（Lv2可复活2次）

    // 连击系统
    this.comboCount = 0
    this.invincibleFrames = 0

    // [v1.1.0] 道具效果状态
    this.speedPackFrames = 0        // 速度包减速剩余帧

    // 全属性加成
    this.allBuffLevel = 0

    // [v1.2.0] 环境状态（由WeatherSystem更新，供风暴之子计算）
    this.weatherActive = false

    // 缓存
    this._statsCache = null
  }

  // ==================== 能力选择 ====================

  /**
   * [v1.1.3] 获取升级可选能力列表
   * @param {number} playerLevel - 玩家当前等级（影响稀有度概率）
   * @returns {Object[]}
   */
  getChoices(playerLevel) {
    let count = Config.ABILITY.CHOICE_COUNT + this.getStat('bonusChoices')

    const allMaxed = Registry.getAll().every(ab => {
      const lv = this.owned.get(ab.id) || 0
      return lv >= ab.maxLevel
    })

    if (allMaxed) return []

    return Registry.rollChoices(this.owned, count, playerLevel || 1)
  }

  selectAbility(id) {
    const def = Registry.get(id)
    if (!def) return

    const currentLevel = this.owned.get(id) || 0
    if (currentLevel >= def.maxLevel) return

    this.owned.set(id, currentLevel + 1)

    // [v1.1.5] 坚韧 → 最大护盾+1/级，获得1层护盾
    if (id === 'toughness') {
      this._recalcMaxShieldLayers()
      this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
      Logger.info('Ability', '坚韧升级', { level: this.owned.get('toughness'), maxShield: this.maxShieldLayers, layers: this.shieldLayers })
    }

    // 护盾爆发 → 初始化计时器
    if (id === 'shield_burst') {
      this.shieldBurstTimer = this._getShieldBurstCD()
    }

    // [v1.1.0] 活力之心 → 提升最大HP
    if (id === 'vitality') {
      const vitLv = this.owned.get('vitality')
      this.maxHp = Config.HP.INITIAL_MAX + vitLv
      this.hp = Math.min(this.hp + 1, this.maxHp)  // 选择时恢复1HP
      Logger.info('Ability', '活力之心升级', { level: vitLv, maxHp: this.maxHp, hp: this.hp })
    }

    // [v1.1.0] 自愈 → 初始化计时器
    if (id === 'regeneration') {
      this.regenerationTimer = this._getRegenerationCD()
      Logger.info('Ability', '自愈升级', { level: this.owned.get('regeneration') })
    }

    // [v1.1.5] 弹力护盾 → 最大护盾+1/级，获得1层护盾，初始化恢复计时器
    if (id === 'bounce_shield') {
      this._recalcMaxShieldLayers()
      this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
      this.bounceShieldRecoverTimer = 0
      Logger.info('Ability', '弹力护盾升级', {
        level: this.owned.get('bounce_shield'),
        maxShield: this.maxShieldLayers,
        layers: this.shieldLayers
      })
    }

    // 凤凰 → 重置使用次数
    if (id === 'phoenix') {
      this.phoenixUsed = 0
    }
  }

  selectAllBuff() {
    this.allBuffLevel = Math.min(this.allBuffLevel + 1, Config.ABILITY.MAX_ALL_BUFF_LEVEL)
  }

  // ==================== 属性计算 ====================

  getStat(key) {
    if (!this._statsCache) {
      this._statsCache = this.getStats()
    }
    return this._statsCache[key]
  }

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

      // 主动技能
      hasTimeWarp: false,
      hasTeleport: false,
      hasShieldBurst: false,
      hasPhoenix: false,

      // [v1.1.0] 新增属性
      maxHpBonus: 0,
      invincibleBonus: 0,
      hasRegeneration: false,
      hasDoubleJump: false,
      expResonanceChance: 0,
      berserkMultiplier: 1.0,
      hasBounceShield: false,  // [v1.1.5] 弹力护盾
      hasIceCrystal: false,    // [v1.2.0] 冰晶护体
    }

    const lv = (id) => this.owned.get(id) || 0
    const allBuff = this.allBuffLevel
    const buffMul = 1 + 0.05 * allBuff

    // [v1.1.0] 狂暴：HP为1时全属性提升
    const berserkLv = lv('berserk')
    const berserkMul = (this.hp <= 1 && berserkLv > 0) ? (1 + 0.25 * berserkLv) : 1.0
    s.berserkMultiplier = berserkMul

    // [v1.2.0] 风暴之子：环境效果期间全属性提升
    const stormChildLv = lv('storm_child')
    const stormMul = (this.weatherActive && stormChildLv > 0) ? (1 + 0.20 * stormChildLv) : 1.0

    // 全属性倍率 = buff × 狂暴 × 风暴之子
    const totalMul = buffMul * berserkMul * stormMul

    // 轻羽: 重力 -8%/级
    s.gravityMultiplier = (1 - 0.08 * lv('light_feather')) * buffMul * berserkMul * stormMul

    // 顺风: 上升力 +10%/级
    s.flapForceMultiplier = (1 + 0.10 * lv('tailwind')) * buffMul * berserkMul * stormMul

    // 灵巧: 碰撞箱 -12%/级
    s.collisionScale = Math.max(0.3, 1 - 0.12 * lv('agile'))

    // 磁吸: 吸引范围 +50px/级
    s.orbAttractRange = Config.ORB.ATTRACT_RANGE + 50 * lv('magnet')

    // 贪婪: 经验获取 +25%/级
    s.expMultiplier = (1 + 0.25 * lv('greed')) * buffMul * berserkMul * stormMul

    // 慢速世界: 障碍速度 -10%/级
    s.scrollSpeedMultiplier = Math.max(0.5, 1 - 0.10 * lv('slow_world'))

    // 双倍积分
    s.scoreMultiplier = Math.round((1 + lv('double_score')) * buffMul * berserkMul * stormMul)

    // 幸运光环
    s.bonusChoices = lv('lucky')

    // 连击之心 [v1.1.2] 平衡调整：阈值 min=2，避免每管触发永久无敌
    s.comboThreshold = Math.max(2, 5 - lv('combo_heart'))

    // 缩小射线 [v1.1.5] 间隙增大 15→20/级
    s.gapBonus = 20 * lv('shrink_ray')

    // [v1.1.0] 活力之心: 最大HP +1/级
    s.maxHpBonus = lv('vitality')

    // [v1.1.0] 体魄: 受击无敌 +30帧/级
    s.invincibleBonus = 30 * lv('physique')

    // [v1.1.0] 经验共鸣: 20%/级概率双倍经验球
    s.expResonanceChance = 0.2 * lv('exp_resonance')

    // 主动技能
    s.hasTimeWarp = lv('time_warp') > 0
    s.hasTeleport = lv('teleport') > 0
    s.hasShieldBurst = lv('shield_burst') > 0
    s.hasPhoenix = lv('phoenix') > 0 && this.phoenixUsed < lv('phoenix')

    // [v1.1.0] 新增主动技能
    s.hasRegeneration = lv('regeneration') > 0
    // [v1.1.5] 弹力护盾（统一护盾系统，不再有独立充能）
    s.hasBounceShield = lv('bounce_shield') > 0
    s.hasDoubleJump = lv('double_jump') > 0
    // [v1.2.0] 冰晶护体
    s.hasIceCrystal = lv('ice_crystal') > 0

    return s
  }

  invalidateStats() {
    this._statsCache = null
  }

  // [v1.2.0] 设置环境活跃状态（由Game.js每帧调用）
  setWeatherActive(active) {
    if (this.weatherActive !== active) {
      this.weatherActive = active
      this.invalidateStats()
    }
  }

  // ==================== 每帧更新 ====================

  tickCooldowns() {
    if (this.timeWarpCD > 0) this.timeWarpCD--
    if (this.teleportCD > 0) this.teleportCD--
    if (this.timeWarpActive > 0) this.timeWarpActive--
    if (this.doubleJumpCD > 0) this.doubleJumpCD--
    if (this.iceCrystalCD > 0) this.iceCrystalCD--  // [v1.2.0] 冰晶护体CD
    if (this.invincibleFrames > 0) this.invincibleFrames--
    if (this.speedPackFrames > 0) this.speedPackFrames--

    // [v1.1.5] 护盾爆发——定期获得1层护盾
    if (this.hasStat('hasShieldBurst')) {
      this.shieldBurstTimer--
      if (this.shieldBurstTimer <= 0) {
        this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
        this.shieldBurstTimer = this._getShieldBurstCD()
        Logger.info('Shield', '护盾爆发获得护盾', { layers: this.shieldLayers, max: this.maxShieldLayers })
      }
    }

    // [v1.1.5] 坚韧护盾恢复（30s恢复1层）
    const toughnessLv = this.owned.get('toughness') || 0
    if (toughnessLv > 0 && this.shieldLayers < this.maxShieldLayers) {
      this.shieldRecoverTimer++
      if (this.shieldRecoverTimer >= Config.SHIELD.TOUGHNESS_RECOVER_CD) {
        this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
        this.shieldRecoverTimer = 0
        Logger.info('Shield', '坚韧护盾恢复', { layers: this.shieldLayers, max: this.maxShieldLayers })
      }
    }

    // [v1.1.5] 弹力护盾恢复（20s-5s/级恢复1层）
    const bounceShieldLv = this.owned.get('bounce_shield') || 0
    if (bounceShieldLv > 0 && this.shieldLayers < this.maxShieldLayers) {
      this.bounceShieldRecoverTimer++
      const cd = this._getBounceShieldRecoverCD()
      if (this.bounceShieldRecoverTimer >= cd) {
        this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
        this.bounceShieldRecoverTimer = 0
        Logger.info('Shield', '弹力护盾恢复', { layers: this.shieldLayers, max: this.maxShieldLayers })
      }
    }

    // [v1.1.0] 自愈
    if (this.hasStat('hasRegeneration') && this.hp < this.maxHp) {
      this.regenerationTimer--
      if (this.regenerationTimer <= 0) {
        this.hp = Math.min(this.hp + 1, this.maxHp)
        this.regenerationTimer = this._getRegenerationCD()
        Logger.info('Ability', '自愈恢复HP', { hp: this.hp, maxHp: this.maxHp, nextCD: this.regenerationTimer })
        this.invalidateStats()  // [v1.1.2] HP变化刷新缓存
      }
    }
  }

  // ==================== CD 计算 ====================

  _getTimeWarpCD() {
    const lv = this.owned.get('time_warp') || 0
    return (20 - 3 * (lv - 1)) * 60
  }

  _getTeleportCD() {
    const lv = this.owned.get('teleport') || 0
    return (30 - 5 * (lv - 1)) * 60
  }

  _getShieldBurstCD() {
    const lv = this.owned.get('shield_burst') || 0
    return (25 - 3 * (lv - 1)) * 60
  }

  // [v1.1.0] 自愈CD
  _getRegenerationCD() {
    const lv = this.owned.get('regeneration') || 0
    return (30 - 5 * (lv - 1)) * 60
  }

  // [v1.1.5] 弹力护盾恢复CD（秒转帧）
  _getBounceShieldRecoverCD() {
    const lv = this.owned.get('bounce_shield') || 0
    const cdSec = Math.max(
      Config.SHIELD.BOUNCE_RECOVER_MIN,
      Config.SHIELD.BOUNCE_RECOVER_BASE - Config.SHIELD.BOUNCE_RECOVER_REDUCTION * (lv - 1)
    )
    return cdSec * 60  // Lv1=20s=1200帧, Lv2=15s=900帧, Lv3=10s=600帧
  }

  // [v1.1.5] 重新计算最大护盾层数 = 默认1 + 坚韧等级 + 弹力护盾等级
  _recalcMaxShieldLayers() {
    const toughnessLv = this.owned.get('toughness') || 0
    const bounceShieldLv = this.owned.get('bounce_shield') || 0
    this.maxShieldLayers = Config.SHIELD.DEFAULT_MAX_LAYERS + toughnessLv + bounceShieldLv
    this.shieldLayers = Math.min(this.shieldLayers, this.maxShieldLayers)
  }

  // [v1.1.0] 二段跳CD
  _getDoubleJumpCD() {
    const lv = this.owned.get('double_jump') || 0
    return (15 - 5 * (lv - 1)) * 60
  }

  // ==================== HP 系统 [v1.1.0] ====================

  /**
   * 受到伤害
   * @returns {boolean} true=死亡, false=存活
   */
  takeDamage() {
    this.hp -= Config.HP.COLLISION_DAMAGE
    this.resetCombo()
    Logger.warn('HP', '受到伤害', { hp: this.hp, maxHp: this.maxHp })
    this.invalidateStats()  // [v1.1.2] 修复：HP变化后刷新缓存，使狂暴立即生效
    if (this.hp <= 0) {
      return true  // 死亡
    }
    return false
  }

  /**
   * 恢复HP
   */
  healHP(amount) {
    const before = this.hp
    this.hp = Math.min(this.hp + amount, this.maxHp)
    Logger.info('HP', '恢复HP', { before, after: this.hp, maxHp: this.maxHp })
    this.invalidateStats()  // [v1.1.2] HP变化刷新缓存
  }

  /**
   * 获取受击无敌帧数（含体魄加成）
   */
  getInvincibleFrames() {
    return Config.HP.INVINCIBLE_FRAMES + this.getStat('invincibleBonus')
  }

  // ==================== [v1.1.5] 统一护盾系统 ====================

  /**
   * 消耗一层护盾
   * @returns {boolean}
   */
  consumeShield() {
    if (this.shieldLayers > 0) {
      this.shieldLayers--
      this.shieldRecoverTimer = 0
      this.bounceShieldRecoverTimer = 0
      Logger.info('Shield', '护盾消耗', { remaining: this.shieldLayers, max: this.maxShieldLayers })
      return true
    }
    return false
  }

  /**
   * [v1.1.5] 添加护盾层（道具拾取/护盾爆发等），不超过最大层数
   */
  addShieldLayer(amount) {
    const before = this.shieldLayers
    this.shieldLayers = Math.min(this.shieldLayers + amount, this.maxShieldLayers)
    Logger.info('Shield', '获得护盾层', { before, after: this.shieldLayers, max: this.maxShieldLayers })
  }

  hasProtection() {
    return this.shieldLayers > 0 ||
           this.invincibleFrames > 0 || this.timeWarpActive > 0
  }

  // ==================== 连击系统 ====================

  onPipePass() {
    this.comboCount++
    const threshold = this.getStat('comboThreshold')
    if (this.comboCount >= threshold) {
      this.invincibleFrames = 180  // [v1.1.2] 300→180帧(3s)，避免永久无敌
      Logger.info('Combo', '连击无敌触发', { comboCount: this.comboCount, threshold, invincibleFrames: 180 })
      this.comboCount = 0
    }
  }

  resetCombo() {
    this.comboCount = 0
  }

  // ==================== 主动技能触发 ====================

  tryTimeWarp() {
    if (!this.getStat('hasTimeWarp') || this.timeWarpCD > 0) return false
    this.timeWarpCD = this._getTimeWarpCD()
    this.timeWarpActive = 60
    Logger.info('Ability', '时间扭曲触发', { cd: this.timeWarpCD })
    return true
  }

  tryTeleport() {
    if (!this.getStat('hasTeleport') || this.teleportCD > 0) return false
    this.teleportCD = this._getTeleportCD()
    Logger.info('Ability', '瞬移触发', { cd: this.teleportCD })
    return true
  }

  tryPhoenix() {
    if (!this.getStat('hasPhoenix')) return false
    this.phoenixUsed++
    this.hp = this.maxHp  // 恢复满HP
    this.invalidateStats()
    Logger.info('Ability', '凤凰复活触发', { phoenixUsed: this.phoenixUsed, hp: this.hp })
    return true
  }

  // [v1.1.0] 二段跳检测
  /**
   * 检查是否触发二段跳
   * @param {number} currentFrame - 当前帧
   * @returns {boolean}
   */
  tryDoubleJump(currentFrame) {
    if (!this.getStat('hasDoubleJump') || this.doubleJumpCD > 0) return false
    // 上次拍翅在8帧内（约133ms），触发二段跳
    if (currentFrame - this.lastFlapFrame <= 8 && currentFrame - this.lastFlapFrame >= 2) {
      this.doubleJumpCD = this._getDoubleJumpCD()
      this.lastFlapFrame = -999
      Logger.info('Ability', '二段跳触发', { cd: this.doubleJumpCD })
      return true
    }
    this.lastFlapFrame = currentFrame
    return false
  }

  // ==================== 道具效果 [v1.1.0] ====================

  /**
   * 激活速度包减速
   */
  setSpeedPack(frames) {
    this.speedPackFrames = frames
  }

  /**
   * 获取速度包减速倍率
   */
  getSpeedPackMultiplier() {
    return this.speedPackFrames > 0 ? Config.ITEM.SPEED_PACK_SLOWDOWN : 1.0
  }

  /**
   * 检查经验共鸣是否触发（每次拾取经验球时调用）
   */
  checkExpResonance() {
    const chance = this.getStat('expResonanceChance')
    return chance > 0 && Math.random() < chance
  }

  // ==================== 工具 ====================

  hasStat(key) {
    if (!this._statsCache) {
      this._statsCache = this.getStats()
    }
    return !!this._statsCache[key]
  }

  getOwnedList() {
    const list = []
    for (const [id, level] of this.owned) {
      list.push({ def: Registry.get(id), level })
    }
    return list
  }
}

module.exports = AbilitySystem
